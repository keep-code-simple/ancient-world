/**
 * Magical Creatures System
 * Friendly, neutral, and hostile creatures with interaction mechanics
 */

const CREATURE_TYPES = {
    fairy: {
        id: 'fairy',
        name: 'Forest Fairy',
        health: 20,
        behavior: 'friendly',
        ability: 'heal',
        abilityValue: 15,
        abilityCooldown: 10,
        speed: 3,
        size: 0.3,
        color: 0x88ffaa,
        glowColor: 0x44ff88,
        biomes: ['magic', 'forest'],
        onAttack: 'flee',
        xp: 5
    },
    spirit_wolf: {
        id: 'spirit_wolf',
        name: 'Spirit Wolf',
        health: 50,
        behavior: 'neutral',
        ability: 'buff_attack',
        abilityValue: 5,
        abilityCooldown: 15,
        speed: 6,
        size: 0.8,
        color: 0x8888cc,
        glowColor: 0x6666aa,
        biomes: ['forest'],
        onAttack: 'hostile',
        attack: 12,
        xp: 30
    },
    phoenix: {
        id: 'phoenix',
        name: 'Phoenix',
        health: 40,
        behavior: 'friendly',
        ability: 'revive',
        abilityValue: 50,
        abilityCooldown: 60,
        speed: 5,
        size: 0.6,
        color: 0xff6600,
        glowColor: 0xff4400,
        biomes: ['magic'],
        onAttack: 'hostile_swarm',
        attack: 8,
        xp: 25
    },
    shadow_cat: {
        id: 'shadow_cat',
        name: 'Shadow Cat',
        health: 35,
        behavior: 'hostile',
        ability: 'stealth',
        abilityValue: 0,
        abilityCooldown: 8,
        speed: 8,
        size: 0.5,
        color: 0x332244,
        glowColor: 0x221133,
        biomes: ['magic', 'swamp'],
        onAttack: null,
        attack: 15,
        xp: 35
    },
    will_o_wisp: {
        id: 'will_o_wisp',
        name: "Will-o'-Wisp",
        health: 15,
        behavior: 'neutral',
        ability: 'lure',
        abilityValue: 0,
        abilityCooldown: 5,
        speed: 4,
        size: 0.25,
        color: 0x66ffff,
        glowColor: 0x44dddd,
        biomes: ['magic'],
        onAttack: 'flee',
        xp: 10
    },
    dragon: {
        id: 'dragon',
        name: 'Pet Dragon',
        health: 100,
        behavior: 'companion', // Special behavior - follows and assists
        ability: 'fire_breath',
        abilityValue: 20,
        abilityCooldown: 8,
        speed: 7,
        size: 1.0,
        color: 0xcc3333,
        glowColor: 0xff6600,
        biomes: ['magic'],
        onAttack: null,
        attack: 15,
        xp: 0, // Can't be killed by enemies
        isCompanion: true,
        earnedBy: 'magic_quest' // Earned through gameplay
    }
};

class CreatureManager {
    constructor(scene, biomeManager) {
        this.scene = scene;
        this.biomeManager = biomeManager;
        this.creatures = [];
        this.maxCreatures = 10;
        this.spawnTimer = 0;
        this.spawnInterval = 8;
    }

    // Spawn creature at position
    spawn(x, z, type) {
        if (this.creatures.length >= this.maxCreatures) return null;

        const creatureData = CREATURE_TYPES[type];
        if (!creatureData) return null;

        const creature = new Creature(this.scene, x, z, type, creatureData, this.biomeManager);
        this.creatures.push(creature);

        return creature;
    }

    // Initial spawn based on biomes
    spawnInitial() {
        // Spawn creatures in their preferred biomes
        Object.values(CREATURE_TYPES).forEach(type => {
            type.biomes.forEach(biomeId => {
                const points = this.biomeManager.getSpawnPointsForBiome(biomeId);
                if (points.length > 0) {
                    const point = points[Math.floor(Math.random() * points.length)];
                    this.spawn(point.x, point.z, type.id);
                }
            });
        });
    }

    // Update all creatures
    update(deltaTime, player, world) {
        // Spawn timer
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval && this.creatures.length < this.maxCreatures) {
            this.spawnTimer = 0;
            this.trySpawnCreature(player);
        }

        // Update each creature
        for (let i = this.creatures.length - 1; i >= 0; i--) {
            const creature = this.creatures[i];
            creature.update(deltaTime, player, world);

            // Remove dead creatures
            if (creature.isDead() && creature.deathTimer > 1) {
                this.scene.remove(creature.group);
                this.creatures.splice(i, 1);
            }
        }
    }

    trySpawnCreature(player) {
        const biome = this.biomeManager.getBiomeAt(player.position.x, player.position.z);
        const validTypes = Object.values(CREATURE_TYPES).filter(t => t.biomes.includes(biome.id));

        if (validTypes.length === 0) return;

        const type = validTypes[Math.floor(Math.random() * validTypes.length)];

        // Spawn away from player
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 15;
        const x = player.position.x + Math.cos(angle) * distance;
        const z = player.position.z + Math.sin(angle) * distance;

        // Check if in valid biome
        const spawnBiome = this.biomeManager.getBiomeAt(x, z);
        if (type.biomes.includes(spawnBiome.id)) {
            this.spawn(x, z, type.id);
        }
    }

    // Get creature near position for interaction
    getNearbyCreature(position, range = 3) {
        for (const creature of this.creatures) {
            if (creature.isDead()) continue;

            const dx = creature.position.x - position.x;
            const dz = creature.position.z - position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < range) {
                return creature;
            }
        }
        return null;
    }

    // Get all creatures of a behavior type
    getCreaturesByBehavior(behavior) {
        return this.creatures.filter(c => !c.isDead() && c.currentBehavior === behavior);
    }
}

class Creature {
    constructor(scene, x, z, type, data, biomeManager) {
        this.scene = scene;
        this.type = type;
        this.data = data;
        this.biomeManager = biomeManager;

        // Stats
        this.maxHealth = data.health;
        this.health = data.health;
        this.speed = data.speed;

        // Behavior
        this.baseBehavior = data.behavior;
        this.currentBehavior = data.behavior;
        this.state = 'idle'; // idle, wander, follow, flee, attack

        // Ability
        this.abilityCooldown = 0;
        this.abilityReady = true;

        // Movement
        this.targetPosition = null;
        this.wanderTimer = 0;
        this.fleeTimer = 0;

        // Death
        this.deathTimer = 0;

        // Stealth (for shadow cat)
        this.isStealthed = false;
        this.stealthTimer = 0;

        // Create model
        this.createModel(x, z, data);
    }

    createModel(x, z, data) {
        this.group = new THREE.Group();

        const scale = data.size;

        switch (this.type) {
            case 'fairy':
                this.createFairyModel(scale, data);
                break;
            case 'spirit_wolf':
                this.createWolfModel(scale, data);
                break;
            case 'phoenix':
                this.createPhoenixModel(scale, data);
                break;
            case 'shadow_cat':
                this.createCatModel(scale, data);
                break;
            case 'will_o_wisp':
                this.createWispModel(scale, data);
                break;
            case 'dragon':
                this.createDragonModel(scale, data);
                break;
            default:
                this.createGenericModel(scale, data);
        }

        // Get terrain height
        const height = this.biomeManager ? this.biomeManager.getHeightAt(x, z) : 0;
        this.group.position.set(x, height, z);

        this.scene.add(this.group);
    }

    // Dragon pet model
    createDragonModel(scale, data) {
        // Body
        const bodyGeom = new THREE.ConeGeometry(0.6 * scale, 1.5 * scale, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: data.color,
            emissive: data.glowColor,
            emissiveIntensity: 0.3,
            roughness: 0.6
        });
        this.body = new THREE.Mesh(bodyGeom, bodyMat);
        this.body.rotation.x = -Math.PI / 2;
        this.body.position.y = 1 * scale;
        this.body.castShadow = true;
        this.group.add(this.body);

        // Head
        const headGeom = new THREE.BoxGeometry(0.4 * scale, 0.3 * scale, 0.5 * scale);
        const head = new THREE.Mesh(headGeom, bodyMat);
        head.position.set(0, 1.2 * scale, 0.8 * scale);
        head.castShadow = true;
        this.group.add(head);

        // Snout
        const snoutGeom = new THREE.BoxGeometry(0.2 * scale, 0.15 * scale, 0.3 * scale);
        const snout = new THREE.Mesh(snoutGeom, bodyMat);
        snout.position.set(0, 1.1 * scale, 1.1 * scale);
        this.group.add(snout);

        // Eyes (glowing)
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const eyeGeom = new THREE.SphereGeometry(0.06 * scale);
        const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
        leftEye.position.set(-0.12 * scale, 1.25 * scale, 1 * scale);
        this.group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
        rightEye.position.set(0.12 * scale, 1.25 * scale, 1 * scale);
        this.group.add(rightEye);

        // Wings
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0x991111,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        // Left wing
        const wingGeom = new THREE.PlaneGeometry(1.5 * scale, 0.8 * scale);
        this.leftWing = new THREE.Mesh(wingGeom, wingMat);
        this.leftWing.position.set(-0.8 * scale, 1.2 * scale, 0);
        this.leftWing.rotation.y = Math.PI / 4;
        this.leftWing.rotation.z = Math.PI / 6;
        this.group.add(this.leftWing);

        // Right wing
        this.rightWing = new THREE.Mesh(wingGeom, wingMat);
        this.rightWing.position.set(0.8 * scale, 1.2 * scale, 0);
        this.rightWing.rotation.y = -Math.PI / 4;
        this.rightWing.rotation.z = -Math.PI / 6;
        this.group.add(this.rightWing);

        // Tail
        const tailGeom = new THREE.CylinderGeometry(0.08 * scale, 0.2 * scale, 1.2 * scale);
        const tail = new THREE.Mesh(tailGeom, bodyMat);
        tail.position.set(0, 0.8 * scale, -0.8 * scale);
        tail.rotation.x = Math.PI / 4;
        this.group.add(tail);

        // Tail spike
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x661111 });
        const spikeGeom = new THREE.ConeGeometry(0.1 * scale, 0.3 * scale, 4);
        const spike = new THREE.Mesh(spikeGeom, spikeMat);
        spike.position.set(0, 0.5 * scale, -1.4 * scale);
        spike.rotation.x = -Math.PI / 4;
        this.group.add(spike);

        // Legs
        const legGeom = new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 0.5 * scale);
        const legMat = new THREE.MeshStandardMaterial({ color: data.color });
        [[-0.3, 0.25, 0.2], [0.3, 0.25, 0.2], [-0.3, 0.25, -0.2], [0.3, 0.25, -0.2]].forEach(pos => {
            const leg = new THREE.Mesh(legGeom, legMat);
            leg.position.set(pos[0] * scale, pos[1] * scale, pos[2] * scale);
            this.group.add(leg);
        });

        // Fire glow
        this.glow = new THREE.PointLight(data.glowColor, 1, 10);
        this.glow.position.set(0, 1 * scale, 0.5 * scale);
        this.group.add(this.glow);
    }

    createFairyModel(scale, data) {
        // Small glowing humanoid
        const bodyGeom = new THREE.SphereGeometry(0.15 * scale, 8, 8);
        const bodyMat = new THREE.MeshBasicMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.9
        });
        this.body = new THREE.Mesh(bodyGeom, bodyMat);
        this.body.position.y = 1.5;
        this.group.add(this.body);

        // Wings
        const wingGeom = new THREE.PlaneGeometry(0.3 * scale, 0.2 * scale);
        const wingMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        this.leftWing = new THREE.Mesh(wingGeom, wingMat);
        this.leftWing.position.set(-0.15 * scale, 1.5, 0);
        this.leftWing.rotation.y = Math.PI / 4;
        this.group.add(this.leftWing);

        this.rightWing = new THREE.Mesh(wingGeom, wingMat);
        this.rightWing.position.set(0.15 * scale, 1.5, 0);
        this.rightWing.rotation.y = -Math.PI / 4;
        this.group.add(this.rightWing);

        // Glow
        const glowGeom = new THREE.SphereGeometry(0.4 * scale, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: data.glowColor,
            transparent: true,
            opacity: 0.3
        });
        this.glow = new THREE.Mesh(glowGeom, glowMat);
        this.glow.position.y = 1.5;
        this.group.add(this.glow);

        // Light
        this.light = new THREE.PointLight(data.glowColor, 0.5, 5);
        this.light.position.y = 1.5;
        this.group.add(this.light);
    }

    createWolfModel(scale, data) {
        // Body
        const bodyGeom = new THREE.BoxGeometry(1.2 * scale, 0.6 * scale, 0.5 * scale);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: data.color,
            emissive: data.glowColor,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.8
        });
        this.body = new THREE.Mesh(bodyGeom, bodyMat);
        this.body.position.y = 0.6 * scale;
        this.body.castShadow = true;
        this.group.add(this.body);

        // Head
        const headGeom = new THREE.BoxGeometry(0.4 * scale, 0.4 * scale, 0.5 * scale);
        const head = new THREE.Mesh(headGeom, bodyMat);
        head.position.set(0.7 * scale, 0.8 * scale, 0);
        this.group.add(head);

        // Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const eyeGeom = new THREE.SphereGeometry(0.05 * scale);
        const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
        leftEye.position.set(0.9 * scale, 0.9 * scale, 0.15 * scale);
        this.group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
        rightEye.position.set(0.9 * scale, 0.9 * scale, -0.15 * scale);
        this.group.add(rightEye);

        // Legs
        const legGeom = new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.5 * scale);
        const legMat = new THREE.MeshStandardMaterial({ color: data.color });
        const legPositions = [
            [0.4, 0.2, 0.2], [0.4, 0.2, -0.2],
            [-0.4, 0.2, 0.2], [-0.4, 0.2, -0.2]
        ];
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeom, legMat);
            leg.position.set(pos[0] * scale, pos[1] * scale, pos[2] * scale);
            this.group.add(leg);
        });

        // Tail
        const tailGeom = new THREE.CylinderGeometry(0.05 * scale, 0.1 * scale, 0.6 * scale);
        const tail = new THREE.Mesh(tailGeom, bodyMat);
        tail.position.set(-0.8 * scale, 0.7 * scale, 0);
        tail.rotation.z = Math.PI / 4;
        this.group.add(tail);
    }

    createPhoenixModel(scale, data) {
        // Body
        const bodyGeom = new THREE.ConeGeometry(0.3 * scale, 0.8 * scale, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: data.color,
            emissive: data.glowColor,
            emissiveIntensity: 0.5
        });
        this.body = new THREE.Mesh(bodyGeom, bodyMat);
        this.body.position.y = 2;
        this.body.rotation.x = Math.PI;
        this.group.add(this.body);

        // Wings
        const wingGeom = new THREE.PlaneGeometry(1.5 * scale, 0.6 * scale);
        const wingMat = new THREE.MeshBasicMaterial({
            color: 0xff8800,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        this.leftWing = new THREE.Mesh(wingGeom, wingMat);
        this.leftWing.position.set(-0.6 * scale, 2, 0);
        this.leftWing.rotation.z = Math.PI / 6;
        this.group.add(this.leftWing);

        this.rightWing = new THREE.Mesh(wingGeom, wingMat);
        this.rightWing.position.set(0.6 * scale, 2, 0);
        this.rightWing.rotation.z = -Math.PI / 6;
        this.group.add(this.rightWing);

        // Tail feathers
        for (let i = 0; i < 5; i++) {
            const featherGeom = new THREE.PlaneGeometry(0.1 * scale, 0.8 * scale);
            const featherMat = new THREE.MeshBasicMaterial({
                color: [0xff6600, 0xff4400, 0xff8800][i % 3],
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            const feather = new THREE.Mesh(featherGeom, featherMat);
            feather.position.set((i - 2) * 0.15 * scale, 1.2, 0);
            feather.rotation.x = Math.PI / 4;
            this.group.add(feather);
        }

        // Fire particles
        const glowGeom = new THREE.SphereGeometry(0.8 * scale);
        const glowMat = new THREE.MeshBasicMaterial({
            color: data.glowColor,
            transparent: true,
            opacity: 0.3
        });
        this.glow = new THREE.Mesh(glowGeom, glowMat);
        this.glow.position.y = 2;
        this.group.add(this.glow);

        // Light
        this.light = new THREE.PointLight(data.color, 1, 8);
        this.light.position.y = 2;
        this.group.add(this.light);
    }

    createCatModel(scale, data) {
        // Sleek body
        const bodyGeom = new THREE.BoxGeometry(0.8 * scale, 0.3 * scale, 0.4 * scale);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.9
        });
        this.body = new THREE.Mesh(bodyGeom, bodyMat);
        this.body.position.y = 0.4 * scale;
        this.body.castShadow = true;
        this.group.add(this.body);

        // Head
        const headGeom = new THREE.BoxGeometry(0.25 * scale, 0.2 * scale, 0.25 * scale);
        const head = new THREE.Mesh(headGeom, bodyMat);
        head.position.set(0.5 * scale, 0.5 * scale, 0);
        this.group.add(head);

        // Glowing eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
        const eyeGeom = new THREE.SphereGeometry(0.03 * scale);
        const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
        leftEye.position.set(0.6 * scale, 0.55 * scale, 0.08 * scale);
        this.group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
        rightEye.position.set(0.6 * scale, 0.55 * scale, -0.08 * scale);
        this.group.add(rightEye);

        // Tail
        const tailGeom = new THREE.CylinderGeometry(0.03 * scale, 0.05 * scale, 0.6 * scale);
        const tail = new THREE.Mesh(tailGeom, bodyMat);
        tail.position.set(-0.6 * scale, 0.5 * scale, 0);
        tail.rotation.z = Math.PI / 3;
        this.group.add(tail);

        // Legs
        const legGeom = new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.3 * scale);
        [[0.25, 0.15], [-0.25, 0.15], [0.25, -0.15], [-0.25, -0.15]].forEach(pos => {
            const leg = new THREE.Mesh(legGeom, bodyMat);
            leg.position.set(pos[0] * scale, 0.15 * scale, pos[1] * scale);
            this.group.add(leg);
        });
    }

    createWispModel(scale, data) {
        // Floating orb
        const orbGeom = new THREE.SphereGeometry(0.2 * scale, 12, 12);
        const orbMat = new THREE.MeshBasicMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.8
        });
        this.body = new THREE.Mesh(orbGeom, orbMat);
        this.body.position.y = 1.5;
        this.group.add(this.body);

        // Outer glow
        const glowGeom = new THREE.SphereGeometry(0.4 * scale, 12, 12);
        const glowMat = new THREE.MeshBasicMaterial({
            color: data.glowColor,
            transparent: true,
            opacity: 0.3
        });
        this.glow = new THREE.Mesh(glowGeom, glowMat);
        this.glow.position.y = 1.5;
        this.group.add(this.glow);

        // Trail particles
        for (let i = 0; i < 5; i++) {
            const particleGeom = new THREE.SphereGeometry(0.05 * scale * (1 - i * 0.15));
            const particle = new THREE.Mesh(particleGeom, orbMat.clone());
            particle.position.set(0, 1.5 - i * 0.15, -i * 0.1);
            particle.material.opacity = 0.5 - i * 0.1;
            this.group.add(particle);
        }

        // Light
        this.light = new THREE.PointLight(data.color, 0.8, 6);
        this.light.position.y = 1.5;
        this.group.add(this.light);
    }

    createGenericModel(scale, data) {
        const geom = new THREE.SphereGeometry(0.3 * scale);
        const mat = new THREE.MeshStandardMaterial({ color: data.color });
        this.body = new THREE.Mesh(geom, mat);
        this.body.position.y = 0.5;
        this.group.add(this.body);
    }

    // Update creature
    update(deltaTime, player, world) {
        if (this.state === 'dead') {
            this.deathTimer += deltaTime;
            this.group.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = Math.max(0, 1 - this.deathTimer);
                }
            });
            return;
        }

        // Ability cooldown
        if (this.abilityCooldown > 0) {
            this.abilityCooldown -= deltaTime;
            if (this.abilityCooldown <= 0) {
                this.abilityReady = true;
            }
        }

        // Distance to player
        const dx = player.position.x - this.position.x;
        const dz = player.position.z - this.position.z;
        const distToPlayer = Math.sqrt(dx * dx + dz * dz);

        // Behavior state machine
        switch (this.currentBehavior) {
            case 'friendly':
                this.updateFriendly(deltaTime, player, distToPlayer, world);
                break;
            case 'neutral':
                this.updateNeutral(deltaTime, player, distToPlayer, world);
                break;
            case 'hostile':
                this.updateHostile(deltaTime, player, distToPlayer, world);
                break;
        }

        // Flee timer
        if (this.fleeTimer > 0) {
            this.fleeTimer -= deltaTime;
            if (this.fleeTimer <= 0) {
                this.state = 'idle';
            }
        }

        // Stealth
        if (this.isStealthed) {
            this.stealthTimer -= deltaTime;
            if (this.stealthTimer <= 0) {
                this.isStealthed = false;
                this.setVisibility(1);
            }
        }

        // Animation
        this.animate(deltaTime);
    }

    updateFriendly(deltaTime, player, distToPlayer, world) {
        // Wander near player
        if (distToPlayer < 15) {
            if (this.state === 'idle') {
                this.state = 'follow';
            }

            // Stay at comfortable distance
            const comfortDist = 5;
            if (distToPlayer > comfortDist + 2) {
                this.moveToward(player.position, deltaTime, world);
            } else if (distToPlayer < comfortDist - 1) {
                this.moveAway(player.position, deltaTime, world);
            }

            // Use healing ability if player hurt
            if (this.data.ability === 'heal' && this.abilityReady) {
                if (player.stats.health < player.stats.maxHealth * 0.7 && distToPlayer < 8) {
                    this.useAbility(player);
                }
            }
        } else {
            this.wander(deltaTime, world);
        }
    }

    updateNeutral(deltaTime, player, distToPlayer, world) {
        // Just wander unless provoked
        this.wander(deltaTime, world);

        // Spirit wolf follows at distance if player is nice
        if (this.type === 'spirit_wolf' && distToPlayer < 20) {
            if (distToPlayer > 8) {
                this.moveToward(player.position, deltaTime * 0.5, world);
            }

            // Buff player occasionally
            if (this.abilityReady && distToPlayer < 10) {
                this.useAbility(player);
            }
        }
    }

    updateHostile(deltaTime, player, distToPlayer, world) {
        // Chase and attack
        if (distToPlayer < 15) {
            if (distToPlayer > 2) {
                this.moveToward(player.position, deltaTime, world);
            } else {
                // Attack
                if (this.abilityReady || this.abilityCooldown <= 0) {
                    this.attackPlayer(player);
                    this.abilityCooldown = 1; // Attack cooldown
                }
            }
        } else {
            this.wander(deltaTime, world);
        }

        // Shadow cat stealth
        if (this.type === 'shadow_cat' && !this.isStealthed && this.abilityReady && distToPlayer < 20) {
            this.isStealthed = true;
            this.stealthTimer = 3;
            this.setVisibility(0.3);
            this.abilityReady = false;
            this.abilityCooldown = this.data.abilityCooldown;
        }
    }

    wander(deltaTime, world) {
        this.wanderTimer -= deltaTime;

        if (this.wanderTimer <= 0 || !this.targetPosition) {
            // Pick new random target
            const angle = Math.random() * Math.PI * 2;
            const dist = 3 + Math.random() * 5;
            this.targetPosition = {
                x: this.position.x + Math.cos(angle) * dist,
                z: this.position.z + Math.sin(angle) * dist
            };
            this.wanderTimer = 2 + Math.random() * 3;
        }

        // Move toward target
        const dx = this.targetPosition.x - this.position.x;
        const dz = this.targetPosition.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.5) {
            const speed = this.speed * 0.3 * deltaTime;
            this.group.position.x += (dx / dist) * speed;
            this.group.position.z += (dz / dist) * speed;
            this.group.rotation.y = Math.atan2(dx, dz);
        } else {
            this.targetPosition = null;
        }
    }

    moveToward(target, deltaTime, world) {
        const dx = target.x - this.position.x;
        const dz = target.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.5) {
            const speed = this.speed * deltaTime;
            this.group.position.x += (dx / dist) * speed;
            this.group.position.z += (dz / dist) * speed;
            this.group.rotation.y = Math.atan2(dx, dz);
        }
    }

    moveAway(target, deltaTime, world) {
        const dx = this.position.x - target.x;
        const dz = this.position.z - target.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.1) {
            const speed = this.speed * deltaTime;
            this.group.position.x += (dx / dist) * speed;
            this.group.position.z += (dz / dist) * speed;
            this.group.rotation.y = Math.atan2(-dx, -dz);
        }
    }

    // Use ability on player
    useAbility(player) {
        if (!this.abilityReady) return;

        switch (this.data.ability) {
            case 'heal':
                const healAmount = this.data.abilityValue;
                player.heal(healAmount);
                this.showAbilityEffect('heal');
                break;
            case 'buff_attack':
                player.stats.attack += this.data.abilityValue;
                this.showAbilityEffect('buff');
                // Temporary buff - could add duration system
                setTimeout(() => {
                    player.stats.attack -= this.data.abilityValue;
                }, 15000);
                break;
            case 'revive':
                // Passive - triggers on player death
                break;
        }

        this.abilityReady = false;
        this.abilityCooldown = this.data.abilityCooldown;
    }

    showAbilityEffect(type) {
        // Visual feedback
        if (this.light) {
            const originalIntensity = this.light.intensity;
            this.light.intensity = 2;
            setTimeout(() => {
                if (this.light) this.light.intensity = originalIntensity;
            }, 500);
        }
    }

    attackPlayer(player) {
        const damage = this.data.attack || 5;
        player.takeDamage(damage);
    }

    // Take damage
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);

        // Flash
        if (this.body && this.body.material) {
            const origColor = this.body.material.color.getHex();
            this.body.material.color.setHex(0xffffff);
            setTimeout(() => {
                if (this.body && this.body.material) {
                    this.body.material.color.setHex(origColor);
                }
            }, 100);
        }

        // React based on type
        if (this.health <= 0) {
            this.die();
        } else {
            this.onDamaged();
        }

        return this.isDead();
    }

    onDamaged() {
        switch (this.data.onAttack) {
            case 'flee':
                this.state = 'flee';
                this.fleeTimer = 5;
                break;
            case 'hostile':
                this.currentBehavior = 'hostile';
                break;
            case 'hostile_swarm':
                this.currentBehavior = 'hostile';
                // Could spawn more hostile creatures here
                break;
        }
    }

    die() {
        this.state = 'dead';
        this.group.rotation.z = Math.PI / 2;
    }

    setVisibility(opacity) {
        this.group.children.forEach(child => {
            if (child.material && child.material.transparent !== undefined) {
                child.material.opacity = child.material.opacity * opacity;
            }
        });
    }

    animate(deltaTime) {
        const time = Date.now() * 0.001;

        // Type-specific animations
        switch (this.type) {
            case 'fairy':
            case 'will_o_wisp':
                // Float up and down
                if (this.body) {
                    this.body.position.y = 1.5 + Math.sin(time * 3) * 0.2;
                }
                if (this.glow) {
                    this.glow.scale.setScalar(1 + Math.sin(time * 4) * 0.1);
                }
                // Wing flutter
                if (this.leftWing) {
                    this.leftWing.rotation.y = Math.PI / 4 + Math.sin(time * 15) * 0.3;
                }
                if (this.rightWing) {
                    this.rightWing.rotation.y = -Math.PI / 4 - Math.sin(time * 15) * 0.3;
                }
                break;
            case 'phoenix':
                // Flap wings
                if (this.leftWing) {
                    this.leftWing.rotation.z = Math.PI / 6 + Math.sin(time * 5) * 0.2;
                }
                if (this.rightWing) {
                    this.rightWing.rotation.z = -Math.PI / 6 - Math.sin(time * 5) * 0.2;
                }
                // Pulse glow
                if (this.glow) {
                    this.glow.scale.setScalar(1 + Math.sin(time * 3) * 0.15);
                }
                break;
        }
    }

    // Interact with creature (E key)
    interact(player) {
        if (this.currentBehavior === 'friendly' || this.currentBehavior === 'neutral') {
            this.useAbility(player);
            return true;
        }
        return false;
    }

    get position() {
        return this.group.position;
    }

    isDead() {
        return this.state === 'dead';
    }
}

// Export
window.CREATURE_TYPES = CREATURE_TYPES;
window.CreatureManager = CreatureManager;
window.Creature = Creature;
