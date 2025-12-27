/**
 * Player Entity - Character with stats, movement, combat, jumping, and swimming
 */

class Player {
    constructor(scene, position = { x: 0, z: 0 }) {
        this.scene = scene;
        this.biomeManager = null; // Set after creation

        // Stats
        this.stats = {
            maxHealth: 100,
            health: 100,
            attack: 10,
            defense: 5,
            speed: 8,
            critChance: 0.1,
            critMultiplier: 2.0,
            maxStamina: 100,
            stamina: 100
        };

        // Progression
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;
        this.kills = 0;

        // Equipment
        this.equipment = {
            weapon: { name: 'Iron Sword', attackBonus: 0, tier: 1 },
            relic: null
        };

        // Resources
        this.resources = {
            ore: 0,
            relicShards: 0
        };

        // Combat state
        this.attackCooldown = 0;
        this.attackSpeed = 0.5;
        this.attackRange = 2.5;
        this.isAttacking = false;
        this.attackAnimTime = 0;

        // Jumping state
        this.isGrounded = true;
        this.isJumping = false;
        this.jumpVelocity = 0;
        this.gravity = -25;
        this.jumpForce = 10;
        this.groundHeight = 0;

        // Swimming state
        this.isSwimming = false;
        this.waterDepth = 0;
        this.swimSpeed = 0.5; // Multiplier when swimming
        this.staminaDrainRate = 10; // Per second in water
        this.staminaRegenRate = 15; // Per second on land

        // Abilities
        this.abilities = {
            powerStrike: false,
            regeneration: false
        };
        this.regenTimer = 0;

        // Status effects
        this.invulnerable = false;
        this.invulnerableTimer = 0;

        // Current biome
        this.currentBiome = null;

        // Create 3D model
        this.createModel(position);
    }

    createModel(position) {
        this.group = new THREE.Group();

        // Body (armored torso)
        const bodyGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a90d9,
            metalness: 0.6,
            roughness: 0.4
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 1.4;
        this.body.castShadow = true;
        this.group.add(this.body);

        // Head
        const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xffcc99,
            roughness: 0.8
        });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.y = 2.25;
        this.head.castShadow = true;
        this.group.add(this.head);

        // Helmet
        const helmetGeometry = new THREE.BoxGeometry(0.6, 0.3, 0.6);
        const helmetMaterial = new THREE.MeshStandardMaterial({
            color: 0x666688,
            metalness: 0.8,
            roughness: 0.3
        });
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.position.y = 2.5;
        helmet.castShadow = true;
        this.group.add(helmet);

        // Arms
        const armGeometry = new THREE.BoxGeometry(0.25, 0.8, 0.25);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a90d9,
            metalness: 0.5
        });

        this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
        this.leftArm.position.set(-0.55, 1.3, 0);
        this.leftArm.castShadow = true;
        this.group.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
        this.rightArm.position.set(0.55, 1.3, 0);
        this.rightArm.castShadow = true;
        this.group.add(this.rightArm);

        // Legs
        const legGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x333344,
            roughness: 0.7
        });

        this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.leftLeg.position.set(-0.2, 0.4, 0);
        this.leftLeg.castShadow = true;
        this.group.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.rightLeg.position.set(0.2, 0.4, 0);
        this.rightLeg.castShadow = true;
        this.group.add(this.rightLeg);

        // Sword
        this.createSword();

        // Shield
        const shieldGeometry = new THREE.BoxGeometry(0.1, 0.7, 0.5);
        const shieldMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.7
        });
        this.shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
        this.shield.position.set(-0.7, 1.3, 0);
        this.shield.castShadow = true;
        this.group.add(this.shield);

        // Power glow (hidden by default)
        const glowGeometry = new THREE.SphereGeometry(1.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x8b5cf6,
            transparent: true,
            opacity: 0,
            side: THREE.BackSide
        });
        this.powerGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.powerGlow.position.y = 1.2;
        this.group.add(this.powerGlow);

        // Position
        this.group.position.set(position.x, 0, position.z);
        this.scene.add(this.group);

        // Collision
        this.collisionRadius = 0.5;
    }

    createSword() {
        // Remove existing sword if any
        if (this.swordGroup) {
            this.group.remove(this.swordGroup);
        }

        this.swordGroup = new THREE.Group();

        // Blade color based on tier
        const tierColors = [0xcccccc, 0x4a90d9, 0xf59e0b, 0xa855f7];
        const bladeColor = tierColors[Math.min(this.equipment.weapon.tier - 1, 3)];

        // Handle
        const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
        const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x5c4a3d });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        this.swordGroup.add(handle);

        // Guard
        const guardGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.1);
        const guardMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.8
        });
        const guard = new THREE.Mesh(guardGeometry, guardMaterial);
        guard.position.y = 0.15;
        this.swordGroup.add(guard);

        // Blade
        const bladeLength = 0.8 + (this.equipment.weapon.tier * 0.1);
        const bladeGeometry = new THREE.BoxGeometry(0.08, bladeLength, 0.02);
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: bladeColor,
            metalness: 0.9,
            roughness: 0.2,
            emissive: bladeColor,
            emissiveIntensity: this.equipment.weapon.tier > 2 ? 0.3 : 0
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.y = 0.15 + bladeLength / 2;
        this.swordGroup.add(blade);

        // Position sword in hand
        this.swordGroup.position.set(0.7, 1.1, 0.3);
        this.swordGroup.rotation.z = -Math.PI / 4;

        this.group.add(this.swordGroup);
        this.sword = this.swordGroup;
    }

    // Set biome manager reference
    setBiomeManager(biomeManager) {
        this.biomeManager = biomeManager;
    }

    // Movement with swimming support
    move(direction, cameraController, deltaTime, world) {
        if (direction.x === 0 && direction.z === 0) {
            return;
        }

        // Get camera-relative direction
        const forward = cameraController.getForwardDirection();
        const right = cameraController.getRightDirection();

        const moveDirection = new THREE.Vector3(
            forward.x * (-direction.z) + right.x * direction.x,
            0,
            forward.z * (-direction.z) + right.z * direction.x
        ).normalize();

        // Calculate speed with swimming modifier
        let speedMultiplier = 1;
        if (this.isSwimming) {
            speedMultiplier = this.swimSpeed;
        }

        const speed = this.stats.speed * speedMultiplier * deltaTime;
        const newPosition = this.group.position.clone();
        newPosition.x += moveDirection.x * speed;
        newPosition.z += moveDirection.z * speed;

        // Check collision before moving
        if (!world.checkCollision(newPosition, this.collisionRadius)) {
            this.group.position.x = newPosition.x;
            this.group.position.z = newPosition.z;

            // Rotate to face movement direction
            const targetAngle = Math.atan2(moveDirection.x, moveDirection.z);
            this.group.rotation.y = THREE.MathUtils.lerp(
                this.group.rotation.y,
                targetAngle,
                10 * deltaTime
            );

            // Walk animation (slower when swimming)
            const walkSpeed = this.isSwimming ? 5 : 10;
            const walkAmount = Math.sin(Date.now() * 0.01 * walkSpeed) * (this.isSwimming ? 0.15 : 0.3);
            this.leftLeg.rotation.x = walkAmount;
            this.rightLeg.rotation.x = -walkAmount;
            this.leftArm.rotation.x = this.isSwimming ? walkAmount : -walkAmount * 0.5;
            this.rightArm.rotation.x = this.isSwimming ? -walkAmount : 0;
        }
    }

    // Jump
    jump() {
        if (this.isGrounded && !this.isSwimming) {
            this.isJumping = true;
            this.isGrounded = false;
            this.jumpVelocity = this.jumpForce;
            return true;
        }
        return false;
    }

    // Update jump physics
    updateJump(deltaTime) {
        if (!this.isGrounded) {
            // Apply gravity
            this.jumpVelocity += this.gravity * deltaTime;
            this.group.position.y += this.jumpVelocity * deltaTime;

            // Check ground collision
            if (this.group.position.y <= this.groundHeight) {
                this.group.position.y = this.groundHeight;
                this.isGrounded = true;
                this.isJumping = false;
                this.jumpVelocity = 0;
            }
        }
    }

    // Update swimming state
    updateSwimming(deltaTime) {
        if (!this.biomeManager) return;

        const inWater = this.biomeManager.isInWater(this.position.x, this.position.z);
        this.waterDepth = this.biomeManager.getWaterDepth(this.position.x, this.position.z);

        if (inWater && this.waterDepth > 0.5) {
            if (!this.isSwimming) {
                this.isSwimming = true;
                // Cancel jump when entering water
                this.isJumping = false;
                this.isGrounded = true;
                this.jumpVelocity = 0;
            }

            // Drain stamina while swimming
            this.stats.stamina -= this.staminaDrainRate * deltaTime;
            if (this.stats.stamina <= 0) {
                this.stats.stamina = 0;
                // Take damage when out of stamina in water
                this.takeDamage(5 * deltaTime);
            }

            // Bob in water
            this.group.position.y = -this.waterDepth * 0.3 + Math.sin(Date.now() * 0.003) * 0.1;
        } else {
            if (this.isSwimming) {
                this.isSwimming = false;
                this.group.position.y = this.groundHeight;
            }

            // Regenerate stamina on land
            if (this.stats.stamina < this.stats.maxStamina) {
                this.stats.stamina = Math.min(
                    this.stats.maxStamina,
                    this.stats.stamina + this.staminaRegenRate * deltaTime
                );
            }
        }

        // Update ground height based on terrain
        if (!this.isSwimming && this.biomeManager) {
            this.groundHeight = this.biomeManager.getHeightAt(this.position.x, this.position.z);
            if (this.isGrounded) {
                this.group.position.y = this.groundHeight;
            }
        }
    }

    // Attack
    attack() {
        if (this.attackCooldown > 0) return false;

        this.isAttacking = true;
        this.attackAnimTime = 0;
        this.attackCooldown = this.attackSpeed;

        return true;
    }

    // Calculate damage
    calculateDamage() {
        const baseDamage = this.stats.attack + this.equipment.weapon.attackBonus;
        const isCrit = Math.random() < this.stats.critChance;

        let damage = baseDamage;
        if (isCrit) {
            damage *= this.stats.critMultiplier;
        }

        // Power strike bonus
        if (this.abilities.powerStrike && this.isAttacking) {
            damage *= 1.25;
        }

        return { damage: Math.round(damage), isCrit };
    }

    // Take damage
    takeDamage(amount) {
        if (this.invulnerable) return 0;

        const finalDamage = Math.max(1, amount - this.stats.defense);
        this.stats.health = Math.max(0, this.stats.health - finalDamage);

        // Brief invulnerability
        this.invulnerable = true;
        this.invulnerableTimer = 0.3;

        // Flash effect
        this.flashDamage();

        return finalDamage;
    }

    flashDamage() {
        const duration = 0.1;
        const flashColor = 0xff0000;

        // Store original colors
        const originalBodyColor = this.body.material.color.getHex();

        // Flash red
        this.body.material.color.setHex(flashColor);

        setTimeout(() => {
            this.body.material.color.setHex(originalBodyColor);
        }, duration * 1000);
    }

    // Gain XP
    gainXP(amount) {
        this.xp += amount;

        while (this.xp >= this.xpToNextLevel) {
            this.levelUp();
        }

        return amount;
    }

    levelUp() {
        this.xp -= this.xpToNextLevel;
        this.level++;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);

        // Stat increases
        this.stats.maxHealth += 10;
        this.stats.health = this.stats.maxHealth;
        this.stats.attack += 2;
        this.stats.defense += 1;

        // Visual scale increase
        const scale = 1 + (this.level - 1) * 0.02;
        this.group.scale.set(scale, scale, scale);

        // Power glow pulse
        this.powerGlow.material.opacity = 0.5;

        return true;
    }

    // Apply forge upgrade
    applyForgeUpgrade() {
        this.equipment.weapon.tier++;
        this.equipment.weapon.attackBonus += 5;
        this.equipment.weapon.name = ['Iron Sword', 'Steel Sword', 'Enchanted Blade', 'Legendary Sword'][
            Math.min(this.equipment.weapon.tier - 1, 3)
        ];

        // Grant power strike
        this.abilities.powerStrike = true;
        this.stats.attack = Math.floor(this.stats.attack * 1.25);

        // Update sword visual
        this.createSword();

        // Clear resources
        this.resources.ore = 0;
    }

    // Apply relic upgrade
    applyRelicUpgrade() {
        // 20% boost to all stats
        this.stats.maxHealth = Math.floor(this.stats.maxHealth * 1.2);
        this.stats.health = this.stats.maxHealth;
        this.stats.attack = Math.floor(this.stats.attack * 1.2);
        this.stats.defense = Math.floor(this.stats.defense * 1.2);
        this.stats.speed *= 1.1;

        // Grant regeneration
        this.abilities.regeneration = true;

        // Visual glow
        this.powerGlow.material.color.setHex(0xa855f7);
        this.powerGlow.material.opacity = 0.3;

        // Clear resources
        this.resources.relicShards = 0;
    }

    // Heal
    heal(amount) {
        const healing = Math.min(amount, this.stats.maxHealth - this.stats.health);
        this.stats.health += healing;
        return healing;
    }

    // Add resource
    addResource(type, amount) {
        if (this.resources[type] !== undefined) {
            this.resources[type] += amount;
        }
    }

    // Update each frame
    update(deltaTime) {
        // Attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        // Jump physics
        this.updateJump(deltaTime);

        // Swimming
        this.updateSwimming(deltaTime);

        // Attack animation
        if (this.isAttacking) {
            this.attackAnimTime += deltaTime;

            // Swing animation
            const swingDuration = 0.3;
            const t = this.attackAnimTime / swingDuration;

            if (t < 1) {
                const swingAngle = Math.sin(t * Math.PI) * 1.5;
                this.swordGroup.rotation.x = swingAngle;
                this.rightArm.rotation.x = swingAngle * 0.5;
            } else {
                this.isAttacking = false;
                this.swordGroup.rotation.x = 0;
                this.rightArm.rotation.x = 0;
            }
        }

        // Invulnerability
        if (this.invulnerable) {
            this.invulnerableTimer -= deltaTime;
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
            }
        }

        // Regeneration ability
        if (this.abilities.regeneration) {
            this.regenTimer += deltaTime;
            if (this.regenTimer >= 2) {
                this.heal(2);
                this.regenTimer = 0;
            }
        }

        // Power glow fade
        if (this.powerGlow.material.opacity > 0.1) {
            this.powerGlow.material.opacity -= deltaTime * 0.3;
        }

        // Idle leg reset (skip if swimming)
        if (!this.isAttacking && !this.isSwimming) {
            this.leftLeg.rotation.x *= 0.9;
            this.rightLeg.rotation.x *= 0.9;
        }
    }

    // Get stamina percentage for UI
    getStaminaPercent() {
        return this.stats.stamina / this.stats.maxStamina;
    }

    // Get position
    get position() {
        return this.group.position;
    }

    // Get mesh for camera target
    get mesh() {
        return this.group;
    }

    // Check if dead
    isDead() {
        return this.stats.health <= 0;
    }
}

// Export for use in other modules
window.Player = Player;
