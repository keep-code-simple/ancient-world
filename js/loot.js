/**
 * Loot System - Handles item drops, pickups, and resource collection
 */

class LootSystem {
    constructor(scene) {
        this.scene = scene;
        this.lootItems = [];

        // Loot properties
        this.magnetRange = 3;   // Auto-pickup range
        this.pickupDelay = 0.3; // Delay before loot can be picked up

        // Visual properties
        this.lootColors = {
            ore: 0x888899,
            relicShards: 0xa855f7,
            health: 0x22c55e
        };

        this.lootEmojis = {
            ore: '🔧',
            relicShards: '💎',
            health: '❤️'
        };
    }

    // Spawn loot at position
    spawnLoot(x, z, type, amount = 1) {
        const loot = new LootItem(this.scene, x, z, type, amount, this.lootColors[type]);
        this.lootItems.push(loot);
        return loot;
    }

    // Update all loot items
    update(deltaTime, player) {
        const collected = [];

        for (let i = this.lootItems.length - 1; i >= 0; i--) {
            const loot = this.lootItems[i];
            loot.update(deltaTime);

            // Check for pickup
            const dx = player.position.x - loot.position.x;
            const dz = player.position.z - loot.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            // Magnetic pull toward player
            if (dist < this.magnetRange && loot.canPickup()) {
                const pullStrength = (this.magnetRange - dist) / this.magnetRange;
                loot.moveToward(player.position, deltaTime * pullStrength * 10);
            }

            // Collect if close enough
            if (dist < 0.8 && loot.canPickup()) {
                const result = this.collectLoot(player, loot);
                collected.push(result);

                this.scene.remove(loot.group);
                this.lootItems.splice(i, 1);
            }
        }

        return collected;
    }

    // Apply loot to player
    collectLoot(player, loot) {
        switch (loot.type) {
            case 'ore':
                player.addResource('ore', loot.amount);
                break;
            case 'relicShards':
                player.addResource('relicShards', loot.amount);
                break;
            case 'health':
                player.heal(loot.amount * 10);
                break;
        }

        return {
            type: loot.type,
            amount: loot.amount,
            emoji: this.lootEmojis[loot.type],
            position: loot.position.clone()
        };
    }

    // Clear all loot
    clearAll() {
        this.lootItems.forEach(loot => {
            this.scene.remove(loot.group);
        });
        this.lootItems = [];
    }
}

class LootItem {
    constructor(scene, x, z, type, amount, color) {
        this.scene = scene;
        this.type = type;
        this.amount = amount;
        this.spawnTime = 0;
        this.floatOffset = Math.random() * Math.PI * 2;

        this.createModel(x, z, color);
    }

    createModel(x, z, color) {
        this.group = new THREE.Group();

        // Main loot object
        let geometry;
        switch (this.type) {
            case 'ore':
                geometry = new THREE.OctahedronGeometry(0.3, 0);
                break;
            case 'relicShards':
                geometry = new THREE.TetrahedronGeometry(0.25, 0);
                break;
            case 'health':
                geometry = new THREE.SphereGeometry(0.25, 8, 8);
                break;
            default:
                geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        }

        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            metalness: 0.5,
            roughness: 0.3
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.group.add(this.mesh);

        // Glow effect
        const glowGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.2
        });
        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.group.add(this.glow);

        // Point light
        const light = new THREE.PointLight(color, 0.5, 3);
        this.group.add(light);

        this.group.position.set(x, 0.5, z);
        this.scene.add(this.group);
    }

    update(deltaTime) {
        this.spawnTime += deltaTime;

        // Float and rotate animation
        this.mesh.position.y = Math.sin(this.spawnTime * 3 + this.floatOffset) * 0.15;
        this.mesh.rotation.y = this.spawnTime * 2;
        this.mesh.rotation.x = Math.sin(this.spawnTime * 1.5) * 0.3;

        // Pulsing glow
        this.glow.scale.setScalar(1 + Math.sin(this.spawnTime * 4) * 0.1);
    }

    moveToward(targetPos, speed) {
        const dx = targetPos.x - this.position.x;
        const dz = targetPos.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.1) {
            this.group.position.x += (dx / dist) * speed;
            this.group.position.z += (dz / dist) * speed;
        }
    }

    canPickup() {
        return this.spawnTime > 0.3;
    }

    get position() {
        return this.group.position;
    }
}

// Export for use in other modules
window.LootSystem = LootSystem;
window.LootItem = LootItem;
