/**
 * AI Companion - Simulated co-op partner
 * Follows player, assists in combat, independent targeting
 * Companion kills count toward player's kill count
 */

class Companion {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Stats (slightly weaker than player)
        this.stats = {
            maxHealth: 80,
            health: 80,
            attack: 8,
            speed: 7
        };

        // Combat
        this.attackCooldown = 0;
        this.attackSpeed = 0.8;
        this.attackRange = 2.5;
        this.target = null;

        // Kill tracking - companion kills count for player
        this.kills = 0;
        this.onKillCallback = null;

        // Behavior
        this.followDistance = 3;
        this.state = 'follow'; // follow, combat, idle

        // Create model
        this.createModel();
    }

    // Set callback for when companion gets a kill
    setOnKillCallback(callback) {
        this.onKillCallback = callback;
    }

    createModel() {
        this.group = new THREE.Group();

        // Different color scheme - green/brown ranger look
        const primaryColor = 0x2d5a27;
        const secondaryColor = 0x5c4a3d;

        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.7, 1.0, 0.4);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: primaryColor,
            roughness: 0.7
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 1.3;
        this.body.castShadow = true;
        this.group.add(this.body);

        // Hood/head
        const hoodGeometry = new THREE.ConeGeometry(0.35, 0.5, 8);
        const hoodMaterial = new THREE.MeshStandardMaterial({
            color: primaryColor,
            roughness: 0.8
        });
        this.hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
        this.hood.position.y = 2.1;
        this.hood.rotation.x = Math.PI;
        this.hood.castShadow = true;
        this.group.add(this.hood);

        // Face
        const faceGeometry = new THREE.BoxGeometry(0.4, 0.35, 0.35);
        const faceMaterial = new THREE.MeshStandardMaterial({
            color: 0xddb892,
            roughness: 0.8
        });
        this.face = new THREE.Mesh(faceGeometry, faceMaterial);
        this.face.position.set(0, 1.95, 0.1);
        this.group.add(this.face);

        // Arms
        const armGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);

        this.leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
        this.leftArm.position.set(-0.5, 1.2, 0);
        this.leftArm.castShadow = true;
        this.group.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
        this.rightArm.position.set(0.5, 1.2, 0);
        this.rightArm.castShadow = true;
        this.group.add(this.rightArm);

        // Bow
        this.createBow();

        // Legs
        const legGeometry = new THREE.BoxGeometry(0.25, 0.7, 0.25);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: secondaryColor
        });

        this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.leftLeg.position.set(-0.18, 0.35, 0);
        this.leftLeg.castShadow = true;
        this.group.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.rightLeg.position.set(0.18, 0.35, 0);
        this.rightLeg.castShadow = true;
        this.group.add(this.rightLeg);

        // Quiver
        const quiverGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8);
        const quiverMaterial = new THREE.MeshStandardMaterial({ color: secondaryColor });
        const quiver = new THREE.Mesh(quiverGeometry, quiverMaterial);
        quiver.position.set(-0.3, 1.4, -0.25);
        quiver.rotation.z = 0.2;
        this.group.add(quiver);

        // Companion indicator (cyan glow ring)
        const indicatorGeometry = new THREE.TorusGeometry(0.6, 0.05, 8, 16);
        const indicatorMaterial = new THREE.MeshBasicMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: 0.6
        });
        this.indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        this.indicator.rotation.x = Math.PI / 2;
        this.indicator.position.y = 0.1;
        this.group.add(this.indicator);

        // Start position (behind player)
        this.group.position.set(
            this.player.position.x - 2,
            0,
            this.player.position.z - 2
        );

        this.scene.add(this.group);

        // Collision
        this.collisionRadius = 0.4;
    }

    createBow() {
        this.bowGroup = new THREE.Group();

        // Bow body (curved)
        const bowCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, -0.5, 0),
            new THREE.Vector3(0.15, -0.25, 0),
            new THREE.Vector3(0.2, 0, 0),
            new THREE.Vector3(0.15, 0.25, 0),
            new THREE.Vector3(0, 0.5, 0)
        ]);

        const bowGeometry = new THREE.TubeGeometry(bowCurve, 20, 0.03, 8, false);
        const bowMaterial = new THREE.MeshStandardMaterial({
            color: 0x5c4a3d,
            roughness: 0.7
        });
        const bow = new THREE.Mesh(bowGeometry, bowMaterial);
        this.bowGroup.add(bow);

        // Bow string
        const stringGeometry = new THREE.BufferGeometry();
        const stringVertices = new Float32Array([
            0, -0.5, 0,
            0, 0.5, 0
        ]);
        stringGeometry.setAttribute('position', new THREE.BufferAttribute(stringVertices, 3));
        const stringMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc });
        const bowString = new THREE.Line(stringGeometry, stringMaterial);
        this.bowGroup.add(bowString);

        this.bowGroup.position.set(-0.6, 1.2, 0.2);
        this.bowGroup.rotation.z = Math.PI / 2;
        this.group.add(this.bowGroup);
    }

    // Update each frame
    update(deltaTime, enemies, world) {
        // Attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        // Find nearest enemy
        this.target = this.findNearestEnemy(enemies);

        // State machine
        if (this.target) {
            this.state = 'combat';
            this.updateCombat(deltaTime, world);
        } else {
            this.state = 'follow';
            this.updateFollow(deltaTime, world);
        }

        // Animate indicator
        this.indicator.rotation.z += deltaTime;

        // Update health if damaged (recover over time)
        if (this.stats.health < this.stats.maxHealth) {
            this.stats.health = Math.min(
                this.stats.maxHealth,
                this.stats.health + deltaTime * 0.5
            );
        }
    }

    findNearestEnemy(enemies) {
        let nearest = null;
        let nearestDist = Infinity;

        const aliveEnemies = enemies.getAliveEnemies();

        for (const enemy of aliveEnemies) {
            const dx = enemy.position.x - this.position.x;
            const dz = enemy.position.z - this.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            // Only target enemies within range
            if (dist < 15 && dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }

    updateFollow(deltaTime, world) {
        // Move toward player if too far
        const dx = this.player.position.x - this.position.x;
        const dz = this.player.position.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > this.followDistance) {
            // Stay behind and to the side of player
            const targetX = this.player.position.x - Math.sin(this.player.group.rotation.y + 0.5) * this.followDistance;
            const targetZ = this.player.position.z - Math.cos(this.player.group.rotation.y + 0.5) * this.followDistance;

            const tdx = targetX - this.position.x;
            const tdz = targetZ - this.position.z;
            const tdist = Math.sqrt(tdx * tdx + tdz * tdz);

            if (tdist > 0.5) {
                const moveSpeed = this.stats.speed * deltaTime;
                const newPos = this.position.clone();
                newPos.x += (tdx / tdist) * moveSpeed;
                newPos.z += (tdz / tdist) * moveSpeed;

                if (!world.checkCollision(newPos, this.collisionRadius)) {
                    this.group.position.copy(newPos);
                }

                // Face movement direction
                this.group.rotation.y = Math.atan2(tdx, tdz);

                // Walk animation
                const walkAmount = Math.sin(Date.now() * 0.015) * 0.3;
                this.leftLeg.rotation.x = walkAmount;
                this.rightLeg.rotation.x = -walkAmount;
            }
        } else {
            // Reset leg positions when idle
            this.leftLeg.rotation.x *= 0.9;
            this.rightLeg.rotation.x *= 0.9;
        }
    }

    updateCombat(deltaTime, world) {
        if (!this.target || this.target.isDead()) {
            this.target = null;
            return;
        }

        const dx = this.target.position.x - this.position.x;
        const dz = this.target.position.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Face target
        this.group.rotation.y = Math.atan2(dx, dz);

        // Keep distance (archer behavior)
        const preferredDistance = 6;

        if (dist < preferredDistance - 1) {
            // Back away
            const moveSpeed = this.stats.speed * 0.5 * deltaTime;
            const newPos = this.position.clone();
            newPos.x -= (dx / dist) * moveSpeed;
            newPos.z -= (dz / dist) * moveSpeed;

            if (!world.checkCollision(newPos, this.collisionRadius)) {
                this.group.position.copy(newPos);
            }
        } else if (dist > preferredDistance + 2) {
            // Move closer
            const moveSpeed = this.stats.speed * deltaTime;
            const newPos = this.position.clone();
            newPos.x += (dx / dist) * moveSpeed;
            newPos.z += (dz / dist) * moveSpeed;

            if (!world.checkCollision(newPos, this.collisionRadius)) {
                this.group.position.copy(newPos);
            }
        }

        // Attack if ready
        if (this.attackCooldown <= 0 && dist < 10) {
            this.attack(this.target);
            this.attackCooldown = this.attackSpeed;
        }

        // Attack animation
        if (this.attackCooldown > this.attackSpeed - 0.2) {
            const t = (this.attackSpeed - this.attackCooldown) / 0.2;
            this.leftArm.rotation.x = Math.sin(t * Math.PI) * 0.5;
        }
    }

    attack(target) {
        // Deal damage
        const damage = this.stats.attack;
        const killed = target.takeDamage(damage);

        // Create arrow projectile visual (simple)
        this.createArrowEffect(target.position);

        // Track kills - companion kills count for player
        if (killed) {
            this.kills++;
            if (this.onKillCallback) {
                this.onKillCallback(target);
            }
        }

        return damage;
    }

    createArrowEffect(targetPos) {
        // Simple arrow line
        const geometry = new THREE.BufferGeometry();
        const start = this.position.clone();
        start.y += 1.2;
        const end = targetPos.clone();
        end.y += 1;

        geometry.setFromPoints([start, end]);

        const material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1
        });

        const arrow = new THREE.Line(geometry, material);
        this.scene.add(arrow);

        // Fade and remove
        let opacity = 1;
        const fadeInterval = setInterval(() => {
            opacity -= 0.1;
            material.opacity = opacity;
            if (opacity <= 0) {
                this.scene.remove(arrow);
                clearInterval(fadeInterval);
            }
        }, 30);
    }

    // Take damage
    takeDamage(amount) {
        this.stats.health = Math.max(0, this.stats.health - amount);

        // Flash effect
        const originalColor = this.body.material.color.getHex();
        this.body.material.color.setHex(0xff6666);
        setTimeout(() => {
            if (this.body) this.body.material.color.setHex(originalColor);
        }, 100);

        return amount;
    }

    // Get position
    get position() {
        return this.group.position;
    }

    // Check if dead
    isDead() {
        return this.stats.health <= 0;
    }

    // Get health percentage for UI
    getHealthPercent() {
        return this.stats.health / this.stats.maxHealth;
    }
}

// Export for use in other modules
window.Companion = Companion;
