/**
 * Enemy System - AI enemies with patrol, chase, and attack behaviors
 */

class EnemyManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 5; // seconds between spawns
        this.maxEnemies = 8;

        // Enemy types
        this.enemyTypes = {
            goblin: {
                name: 'Goblin',
                health: 30,
                attack: 5,
                speed: 4,
                xp: 20,
                color: 0x4a7c4f,
                scale: 0.7,
                loot: { ore: 1, chance: 0.3 }
            },
            orc: {
                name: 'Orc',
                health: 60,
                attack: 12,
                speed: 2.5,
                xp: 40,
                color: 0x5c4a3d,
                scale: 1.2,
                loot: { ore: 2, relicShards: 1, chance: 0.5 }
            },
            skeleton: {
                name: 'Skeleton',
                health: 40,
                attack: 8,
                speed: 3.5,
                xp: 30,
                color: 0xccccaa,
                scale: 0.9,
                loot: { relicShards: 1, chance: 0.4 }
            }
        };
    }

    // Spawn enemy at position
    spawn(x, z, type = null) {
        if (this.enemies.length >= this.maxEnemies) return null;

        // Random type if not specified
        if (!type) {
            const types = Object.keys(this.enemyTypes);
            type = types[Math.floor(Math.random() * types.length)];
        }

        const enemyData = this.enemyTypes[type];
        const enemy = new Enemy(this.scene, x, z, type, enemyData);
        this.enemies.push(enemy);

        return enemy;
    }

    // Initial spawn
    spawnInitial(spawnPoints) {
        // Spawn around the camp
        const campSpawn = spawnPoints.find(p => p.type === 'camp');
        if (campSpawn) {
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2;
                const x = campSpawn.x + Math.cos(angle) * 8;
                const z = campSpawn.z + Math.sin(angle) * 8;
                this.spawn(x, z, i === 0 ? 'orc' : 'goblin');
            }
        }

        // Scatter some around the world
        const scatterPositions = [
            { x: -15, z: 10 },
            { x: 10, z: -15 },
            { x: -5, z: -25 },
            { x: 20, z: 0 }
        ];

        scatterPositions.forEach(pos => {
            const types = ['goblin', 'skeleton'];
            this.spawn(pos.x, pos.z, types[Math.floor(Math.random() * types.length)]);
        });
    }

    // Update all enemies
    update(deltaTime, player, world) {
        // Spawn timer
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval && this.enemies.length < this.maxEnemies) {
            this.spawnTimer = 0;

            // Spawn at random position away from player
            let attempts = 0;
            while (attempts < 10) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 20 + Math.random() * 20;
                const x = player.position.x + Math.cos(angle) * distance;
                const z = player.position.z + Math.sin(angle) * distance;

                // Check bounds
                if (x > -45 && x < 45 && z > -45 && z < 45) {
                    this.spawn(x, z);
                    break;
                }
                attempts++;
            }
        }

        // Update each enemy
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime, player, world);

            // Remove dead enemies
            if (enemy.isDead() && enemy.deathTimer > 1) {
                this.scene.remove(enemy.group);
                this.enemies.splice(i, 1);
            }
        }
    }

    // Get enemies in range of position
    getEnemiesInRange(position, range) {
        return this.enemies.filter(enemy => {
            if (enemy.isDead()) return false;
            const dx = enemy.position.x - position.x;
            const dz = enemy.position.z - position.z;
            return Math.sqrt(dx * dx + dz * dz) <= range;
        });
    }

    // Get all alive enemies
    getAliveEnemies() {
        return this.enemies.filter(e => !e.isDead());
    }
}

class Enemy {
    constructor(scene, x, z, type, data) {
        this.scene = scene;
        this.type = type;
        this.data = data;

        // Stats
        this.maxHealth = data.health;
        this.health = data.health;
        this.attack = data.attack;
        this.speed = data.speed;
        this.xpValue = data.xp;

        // AI State
        this.state = 'patrol'; // patrol, chase, attack, dead
        this.patrolCenter = new THREE.Vector3(x, 0, z);
        this.patrolRadius = 5;
        this.patrolTarget = null;
        this.patrolWaitTimer = 0;

        // Combat
        this.attackCooldown = 0;
        this.attackSpeed = 1.5;
        this.attackRange = 2;
        this.aggroRange = 12;
        this.chaseRange = 20;

        // Death
        this.deathTimer = 0;

        // Create model
        this.createModel(x, z, data);
    }

    createModel(x, z, data) {
        this.group = new THREE.Group();

        const scale = data.scale;

        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.7 * scale, 1 * scale, 0.4 * scale);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: data.color,
            roughness: 0.8
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 0.8 * scale;
        this.body.castShadow = true;
        this.group.add(this.body);

        // Head
        const headGeometry = new THREE.BoxGeometry(0.5 * scale, 0.4 * scale, 0.4 * scale);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: this.type === 'skeleton' ? 0xeeeedd : data.color,
            roughness: 0.7
        });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.y = 1.5 * scale;
        this.head.castShadow = true;
        this.group.add(this.head);

        // Eyes (red for aggression)
        const eyeGeometry = new THREE.SphereGeometry(0.08 * scale, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.12 * scale, 1.55 * scale, 0.18 * scale);
        this.group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.12 * scale, 1.55 * scale, 0.18 * scale);
        this.group.add(rightEye);

        // Arms
        const armGeometry = new THREE.BoxGeometry(0.2 * scale, 0.6 * scale, 0.2 * scale);
        const armMaterial = new THREE.MeshStandardMaterial({ color: data.color });

        this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
        this.leftArm.position.set(-0.5 * scale, 0.7 * scale, 0);
        this.group.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
        this.rightArm.position.set(0.5 * scale, 0.7 * scale, 0);
        this.group.add(this.rightArm);

        // Weapon (club or bone)
        const weaponGeometry = new THREE.CylinderGeometry(0.08 * scale, 0.12 * scale, 0.8 * scale, 6);
        const weaponMaterial = new THREE.MeshStandardMaterial({
            color: this.type === 'skeleton' ? 0xddddcc : 0x5c4a3d
        });
        this.weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        this.weapon.position.set(0.6 * scale, 0.7 * scale, 0.4 * scale);
        this.weapon.rotation.z = -Math.PI / 4;
        this.group.add(this.weapon);

        // Legs
        const legGeometry = new THREE.BoxGeometry(0.25 * scale, 0.5 * scale, 0.25 * scale);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: this.type === 'skeleton' ? 0xddddcc : 0x333333
        });

        this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.leftLeg.position.set(-0.18 * scale, 0.25 * scale, 0);
        this.group.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.rightLeg.position.set(0.18 * scale, 0.25 * scale, 0);
        this.group.add(this.rightLeg);

        // Health bar
        this.createHealthBar(scale);

        // Position
        this.group.position.set(x, 0, z);
        this.scene.add(this.group);

        // Collision
        this.collisionRadius = 0.5 * scale;
    }

    createHealthBar(scale) {
        // Background
        const bgGeometry = new THREE.PlaneGeometry(1 * scale, 0.15 * scale);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.8
        });
        const bg = new THREE.Mesh(bgGeometry, bgMaterial);
        bg.position.y = 2 * scale;
        this.group.add(bg);

        // Health fill
        const fillGeometry = new THREE.PlaneGeometry(0.96 * scale, 0.11 * scale);
        const fillMaterial = new THREE.MeshBasicMaterial({
            color: 0xef4444
        });
        this.healthFill = new THREE.Mesh(fillGeometry, fillMaterial);
        this.healthFill.position.y = 2 * scale;
        this.healthFill.position.z = 0.01;
        this.group.add(this.healthFill);

        this.healthBarScale = scale;
    }

    updateHealthBar() {
        const healthPercent = this.health / this.maxHealth;
        this.healthFill.scale.x = healthPercent;
        this.healthFill.position.x = (1 - healthPercent) * -0.48 * this.healthBarScale;
    }

    // Take damage
    takeDamage(amount, isCrit = false) {
        this.health = Math.max(0, this.health - amount);
        this.updateHealthBar();

        // Flash effect
        const originalColor = this.body.material.color.getHex();
        this.body.material.color.setHex(0xffffff);
        setTimeout(() => {
            if (this.body) this.body.material.color.setHex(originalColor);
        }, 100);

        if (this.health <= 0) {
            this.die();
        }

        return this.isDead();
    }

    die() {
        this.state = 'dead';

        // Death animation - fall over
        this.group.rotation.x = Math.PI / 2;
        this.group.position.y = 0.3;
    }

    // AI update
    update(deltaTime, player, world) {
        if (this.state === 'dead') {
            this.deathTimer += deltaTime;
            // Fade out
            this.group.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = Math.max(0, 1 - this.deathTimer);
                    child.material.transparent = true;
                }
            });
            return;
        }

        // Attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        // Distance to player
        const dx = player.position.x - this.position.x;
        const dz = player.position.z - this.position.z;
        const distToPlayer = Math.sqrt(dx * dx + dz * dz);

        // State machine
        switch (this.state) {
            case 'patrol':
                this.updatePatrol(deltaTime, player, distToPlayer, world);
                break;
            case 'chase':
                this.updateChase(deltaTime, player, distToPlayer, world);
                break;
            case 'attack':
                this.updateAttack(deltaTime, player, distToPlayer);
                break;
        }

        // Make health bar face camera
        // (Health bar always faces forward for simplicity)
    }

    updatePatrol(deltaTime, player, distToPlayer, world) {
        // Check for aggro
        if (distToPlayer < this.aggroRange) {
            this.state = 'chase';
            return;
        }

        // Wait at patrol point
        if (this.patrolWaitTimer > 0) {
            this.patrolWaitTimer -= deltaTime;
            return;
        }

        // Pick new patrol target
        if (!this.patrolTarget) {
            const angle = Math.random() * Math.PI * 2;
            this.patrolTarget = new THREE.Vector3(
                this.patrolCenter.x + Math.cos(angle) * this.patrolRadius,
                0,
                this.patrolCenter.z + Math.sin(angle) * this.patrolRadius
            );
        }

        // Move toward patrol target
        const tx = this.patrolTarget.x - this.position.x;
        const tz = this.patrolTarget.z - this.position.z;
        const dist = Math.sqrt(tx * tx + tz * tz);

        if (dist < 0.5) {
            this.patrolTarget = null;
            this.patrolWaitTimer = 1 + Math.random() * 2;
        } else {
            this.moveToward(tx / dist, tz / dist, deltaTime * 0.5, world);
        }
    }

    updateChase(deltaTime, player, distToPlayer, world) {
        // Lose aggro if too far
        if (distToPlayer > this.chaseRange) {
            this.state = 'patrol';
            return;
        }

        // Attack if in range
        if (distToPlayer < this.attackRange) {
            this.state = 'attack';
            return;
        }

        // Move toward player
        const dx = player.position.x - this.position.x;
        const dz = player.position.z - this.position.z;
        this.moveToward(dx / distToPlayer, dz / distToPlayer, deltaTime, world);
    }

    updateAttack(deltaTime, player, distToPlayer) {
        // Chase if out of range
        if (distToPlayer > this.attackRange * 1.2) {
            this.state = 'chase';
            return;
        }

        // Face player
        const dx = player.position.x - this.position.x;
        const dz = player.position.z - this.position.z;
        this.group.rotation.y = Math.atan2(dx, dz);

        // Attack
        if (this.attackCooldown <= 0) {
            this.performAttack(player);
            this.attackCooldown = this.attackSpeed;
        }

        // Attack animation
        if (this.attackCooldown > this.attackSpeed - 0.3) {
            const t = (this.attackSpeed - this.attackCooldown) / 0.3;
            this.rightArm.rotation.x = Math.sin(t * Math.PI) * 1.5;
            this.weapon.rotation.x = Math.sin(t * Math.PI) * 1.0;
        }
    }

    moveToward(dirX, dirZ, deltaTime, world) {
        const newPos = this.position.clone();
        newPos.x += dirX * this.speed * deltaTime;
        newPos.z += dirZ * this.speed * deltaTime;

        // Simple collision check
        if (!world.checkCollision(newPos, this.collisionRadius)) {
            this.group.position.copy(newPos);
        }

        // Face movement direction
        this.group.rotation.y = Math.atan2(dirX, dirZ);

        // Walk animation
        const walkSpeed = this.speed * 2;
        const walkAmount = Math.sin(Date.now() * 0.01 * walkSpeed) * 0.4;
        this.leftLeg.rotation.x = walkAmount;
        this.rightLeg.rotation.x = -walkAmount;
    }

    performAttack(player) {
        // Deal damage to player
        const damage = player.takeDamage(this.attack);
        return damage;
    }

    // Get position
    get position() {
        return this.group.position;
    }

    // Check if dead
    isDead() {
        return this.state === 'dead';
    }

    // Get loot drops
    getLoot() {
        const loot = [];

        if (Math.random() < this.data.loot.chance) {
            if (this.data.loot.ore) {
                loot.push({ type: 'ore', amount: this.data.loot.ore });
            }
            if (this.data.loot.relicShards) {
                loot.push({ type: 'relicShards', amount: this.data.loot.relicShards });
            }
        }

        return loot;
    }
}

// Export for use in other modules
window.EnemyManager = EnemyManager;
window.Enemy = Enemy;
