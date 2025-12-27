/**
 * Biome System - Defines biome zones with unique visuals and properties
 */

// Biome type definitions
const BIOME_TYPES = {
    FOREST: {
        id: 'forest',
        name: 'Whispering Woods',
        groundColor: 0x3d5c3d,
        fogColor: 0x87ceeb,
        fogNear: 40,
        fogFar: 100,
        ambientColor: 0x404060,
        ambientIntensity: 0.5,
        treeTypes: ['pine', 'oak'],
        treeDensity: 0.8,
        hasWater: false,
        enemyTypes: ['goblin', 'orc', 'skeleton'],
        creatureTypes: ['spirit_wolf'],
        music: 'forest_ambient'
    },
    SWAMP: {
        id: 'swamp',
        name: 'Murky Marshlands',
        groundColor: 0x4a4a35,
        fogColor: 0x6b7b5a,
        fogNear: 20,
        fogFar: 60,
        ambientColor: 0x3a4a3a,
        ambientIntensity: 0.3,
        treeTypes: ['dead', 'willow'],
        treeDensity: 0.4,
        hasWater: true,
        waterColor: 0x3a4a35,
        enemyTypes: ['bog_lurker', 'poison_frog'],
        creatureTypes: [],
        music: 'swamp_ambient'
    },
    MAGIC: {
        id: 'magic',
        name: 'Arcane Glade',
        groundColor: 0x4a3d5c,
        fogColor: 0x9b7bcb,
        fogNear: 30,
        fogFar: 80,
        ambientColor: 0x6040a0,
        ambientIntensity: 0.6,
        treeTypes: ['crystal', 'ancient'],
        treeDensity: 0.5,
        hasWater: false,
        enemyTypes: ['wisp', 'corrupted_golem'],
        creatureTypes: ['fairy', 'phoenix'],
        music: 'magic_ambient'
    }
};

class BiomeManager {
    constructor(scene) {
        this.scene = scene;
        this.currentBiome = null;

        // World size (3x larger than original)
        this.worldSize = 150;

        // Define biome zones (rectangular regions)
        this.biomeZones = [
            {
                type: BIOME_TYPES.FOREST,
                bounds: { minX: -75, maxX: 75, minZ: -75, maxZ: 25 },
                center: { x: 0, z: -25 }
            },
            {
                type: BIOME_TYPES.SWAMP,
                bounds: { minX: -75, maxX: 0, minZ: 25, maxZ: 75 },
                center: { x: -37.5, z: 50 }
            },
            {
                type: BIOME_TYPES.MAGIC,
                bounds: { minX: 0, maxX: 75, minZ: 25, maxZ: 75 },
                center: { x: 37.5, z: 50 }
            }
        ];

        // Water bodies in swamp
        this.waterBodies = [];

        // Height map for terrain
        this.heightMap = new Map();

        // Biome-specific objects
        this.biomeObjects = {
            forest: [],
            swamp: [],
            magic: []
        };
    }

    // Get biome at a specific position
    getBiomeAt(x, z) {
        for (const zone of this.biomeZones) {
            const b = zone.bounds;
            if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
                return zone.type;
            }
        }
        // Default to forest
        return BIOME_TYPES.FOREST;
    }

    // Get biome zone info
    getBiomeZoneAt(x, z) {
        for (const zone of this.biomeZones) {
            const b = zone.bounds;
            if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
                return zone;
            }
        }
        return this.biomeZones[0];
    }

    // Check if position is in water
    isInWater(x, z) {
        for (const water of this.waterBodies) {
            const dx = x - water.x;
            const dz = z - water.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < water.radius) {
                return true;
            }
        }
        return false;
    }

    // Get water depth at position
    getWaterDepth(x, z) {
        for (const water of this.waterBodies) {
            const dx = x - water.x;
            const dz = z - water.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < water.radius) {
                // Deeper toward center
                return (1 - dist / water.radius) * water.depth;
            }
        }
        return 0;
    }

    // Get terrain height at position
    getHeightAt(x, z) {
        // Simple perlin-like height based on position
        const key = `${Math.floor(x / 5)}_${Math.floor(z / 5)}`;
        if (this.heightMap.has(key)) {
            return this.heightMap.get(key);
        }

        // Generate height based on biome
        const biome = this.getBiomeAt(x, z);
        let height = 0;

        if (biome.id === 'magic') {
            // Magic biome has floating islands effect
            height = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
        } else if (biome.id === 'swamp') {
            // Swamp is flat and low
            height = -0.5 + Math.random() * 0.3;
        } else {
            // Forest has gentle hills
            height = Math.sin(x * 0.05) * Math.sin(z * 0.05) * 3;
        }

        this.heightMap.set(key, height);
        return height;
    }

    // Create terrain for all biomes
    createTerrain() {
        const segments = 60;
        const geometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize, segments, segments);

        // Modify vertices for height and color per biome
        const positions = geometry.attributes.position.array;
        const colors = new Float32Array(positions.length);

        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 1];

            // Get biome at this vertex
            const biome = this.getBiomeAt(x, z);

            // Set height
            const height = this.getHeightAt(x, z);
            positions[i + 2] = height;

            // Set color based on biome
            const color = new THREE.Color(biome.groundColor);

            // Add variation
            const variation = (Math.random() - 0.5) * 0.1;
            color.r = Math.max(0, Math.min(1, color.r + variation));
            color.g = Math.max(0, Math.min(1, color.g + variation));
            color.b = Math.max(0, Math.min(1, color.b + variation));

            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.9,
            metalness: 0.1
        });

        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        terrain.name = 'terrain';

        this.scene.add(terrain);
        this.terrain = terrain;

        return terrain;
    }

    // Create water bodies for swamp biome
    createWaterBodies() {
        const swampZone = this.biomeZones.find(z => z.type.id === 'swamp');
        if (!swampZone) return;

        // Main lake
        this.createWaterBody(-40, 50, 20, 3);

        // Smaller ponds
        this.createWaterBody(-55, 40, 8, 2);
        this.createWaterBody(-25, 60, 10, 2.5);
        this.createWaterBody(-50, 65, 6, 1.5);

        // River connecting to forest (transition zone)
        this.createRiver();
    }

    createWaterBody(x, z, radius, depth) {
        // Water surface
        const geometry = new THREE.CircleGeometry(radius, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0x3a5a4a,
            transparent: true,
            opacity: 0.7,
            roughness: 0.2,
            metalness: 0.3
        });

        const water = new THREE.Mesh(geometry, material);
        water.rotation.x = -Math.PI / 2;
        water.position.set(x, -0.3, z);
        water.receiveShadow = true;
        water.name = 'water';

        this.scene.add(water);

        // Track water body
        this.waterBodies.push({ x, z, radius, depth, mesh: water });

        // Add water glow
        const glowGeometry = new THREE.CircleGeometry(radius * 1.1, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a6a5a,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.rotation.x = -Math.PI / 2;
        glow.position.set(x, -0.35, z);
        this.scene.add(glow);
    }

    createRiver() {
        // River from swamp toward forest
        const riverPoints = [
            { x: -25, z: 25, width: 4 },
            { x: -20, z: 15, width: 5 },
            { x: -15, z: 5, width: 4 },
            { x: -10, z: -5, width: 3 }
        ];

        riverPoints.forEach((point, i) => {
            this.waterBodies.push({
                x: point.x,
                z: point.z,
                radius: point.width,
                depth: 1.5
            });

            // Visual water
            const geometry = new THREE.CircleGeometry(point.width, 16);
            const material = new THREE.MeshStandardMaterial({
                color: 0x3a5a5a,
                transparent: true,
                opacity: 0.6
            });
            const water = new THREE.Mesh(geometry, material);
            water.rotation.x = -Math.PI / 2;
            water.position.set(point.x, -0.25, point.z);
            this.scene.add(water);
        });
    }

    // Create biome-specific environment objects
    createBiomeEnvironment(biomeType, objectsArray) {
        const zone = this.biomeZones.find(z => z.type.id === biomeType);
        if (!zone) return [];

        const objects = [];
        const b = zone.bounds;

        // Generate trees based on density
        const treeCount = Math.floor(zone.type.treeDensity * 30);

        for (let i = 0; i < treeCount; i++) {
            const x = b.minX + Math.random() * (b.maxX - b.minX);
            const z = b.minZ + Math.random() * (b.maxZ - b.minZ);

            // Don't place in water
            if (this.isInWater(x, z)) continue;

            const treeType = zone.type.treeTypes[Math.floor(Math.random() * zone.type.treeTypes.length)];
            const tree = this.createBiomeTree(x, z, treeType, biomeType);
            if (tree) {
                objects.push(tree);
                objectsArray.push(tree);
            }
        }

        this.biomeObjects[biomeType] = objects;
        return objects;
    }

    createBiomeTree(x, z, treeType, biomeType) {
        const group = new THREE.Group();
        const height = this.getHeightAt(x, z);

        switch (biomeType) {
            case 'forest':
                return this.createForestTree(x, z, height, treeType);
            case 'swamp':
                return this.createSwampTree(x, z, height, treeType);
            case 'magic':
                return this.createMagicTree(x, z, height, treeType);
            default:
                return null;
        }
    }

    createForestTree(x, z, height, type) {
        const group = new THREE.Group();

        // Trunk
        const trunkGeom = new THREE.CylinderGeometry(0.3, 0.5, 4, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4a3d });
        const trunk = new THREE.Mesh(trunkGeom, trunkMat);
        trunk.position.y = 2;
        trunk.castShadow = true;
        group.add(trunk);

        // Foliage
        const foliageColor = type === 'pine' ? 0x2d5a27 : 0x3d7a3d;
        const foliageMat = new THREE.MeshStandardMaterial({ color: foliageColor });

        if (type === 'pine') {
            // Cone layers
            for (let i = 0; i < 3; i++) {
                const foliage = new THREE.Mesh(
                    new THREE.ConeGeometry(2 - i * 0.5, 2.5, 8),
                    foliageMat
                );
                foliage.position.y = 4.5 + i * 1.5;
                foliage.castShadow = true;
                group.add(foliage);
            }
        } else {
            // Round canopy
            const foliage = new THREE.Mesh(
                new THREE.SphereGeometry(2.5, 8, 6),
                foliageMat
            );
            foliage.position.y = 5.5;
            foliage.castShadow = true;
            group.add(foliage);
        }

        group.position.set(x, height, z);
        group.rotation.y = Math.random() * Math.PI * 2;

        const scale = 0.7 + Math.random() * 0.6;
        group.scale.set(scale, scale, scale);

        this.scene.add(group);
        return { group, position: group.position, radius: 0.5 };
    }

    createSwampTree(x, z, height, type) {
        const group = new THREE.Group();

        // Dead/twisted trunk
        const trunkGeom = new THREE.CylinderGeometry(0.2, 0.4, 3, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a3a30 });
        const trunk = new THREE.Mesh(trunkGeom, trunkMat);
        trunk.position.y = 1.5;
        trunk.rotation.z = (Math.random() - 0.5) * 0.3;
        trunk.castShadow = true;
        group.add(trunk);

        if (type === 'willow') {
            // Hanging vines
            const vineMat = new THREE.MeshBasicMaterial({ color: 0x4a5a3a });
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const vineGeom = new THREE.CylinderGeometry(0.02, 0.02, 2 + Math.random(), 4);
                const vine = new THREE.Mesh(vineGeom, vineMat);
                vine.position.set(Math.cos(angle) * 0.8, 2.5, Math.sin(angle) * 0.8);
                group.add(vine);
            }
        } else {
            // Dead branches
            for (let i = 0; i < 3; i++) {
                const branchGeom = new THREE.CylinderGeometry(0.05, 0.1, 1.5, 4);
                const branch = new THREE.Mesh(branchGeom, trunkMat);
                branch.position.y = 2.5 + i * 0.3;
                branch.rotation.z = Math.PI / 4 + Math.random() * 0.3;
                branch.rotation.y = (i / 3) * Math.PI * 2;
                group.add(branch);
            }
        }

        group.position.set(x, height - 0.5, z);
        this.scene.add(group);
        return { group, position: group.position, radius: 0.4 };
    }

    createMagicTree(x, z, height, type) {
        const group = new THREE.Group();

        if (type === 'crystal') {
            // Crystal formation
            const crystalColors = [0x9b59b6, 0x8e44ad, 0x6c3483, 0xa569bd];

            for (let i = 0; i < 5; i++) {
                const crystalGeom = new THREE.ConeGeometry(0.3, 2 + Math.random() * 2, 6);
                const crystalMat = new THREE.MeshStandardMaterial({
                    color: crystalColors[i % crystalColors.length],
                    emissive: crystalColors[i % crystalColors.length],
                    emissiveIntensity: 0.3,
                    transparent: true,
                    opacity: 0.9
                });
                const crystal = new THREE.Mesh(crystalGeom, crystalMat);
                crystal.position.set(
                    (Math.random() - 0.5) * 1.5,
                    1 + Math.random(),
                    (Math.random() - 0.5) * 1.5
                );
                crystal.rotation.z = (Math.random() - 0.5) * 0.5;
                crystal.castShadow = true;
                group.add(crystal);
            }

            // Glow
            const glowGeom = new THREE.SphereGeometry(1.5, 8, 8);
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0x9b59b6,
                transparent: true,
                opacity: 0.2
            });
            const glow = new THREE.Mesh(glowGeom, glowMat);
            glow.position.y = 2;
            group.add(glow);
        } else {
            // Ancient glowing tree
            const trunkGeom = new THREE.CylinderGeometry(0.4, 0.6, 5, 8);
            const trunkMat = new THREE.MeshStandardMaterial({
                color: 0x4a3a5a,
                emissive: 0x2a1a3a,
                emissiveIntensity: 0.2
            });
            const trunk = new THREE.Mesh(trunkGeom, trunkMat);
            trunk.position.y = 2.5;
            trunk.castShadow = true;
            group.add(trunk);

            // Glowing leaves
            const leafMat = new THREE.MeshStandardMaterial({
                color: 0xbb99dd,
                emissive: 0x8866aa,
                emissiveIntensity: 0.4,
                transparent: true,
                opacity: 0.8
            });
            const leaves = new THREE.Mesh(
                new THREE.SphereGeometry(3, 8, 6),
                leafMat
            );
            leaves.position.y = 6;
            leaves.castShadow = true;
            group.add(leaves);

            // Particle effect (simple floating orbs)
            for (let i = 0; i < 5; i++) {
                const orbGeom = new THREE.SphereGeometry(0.1);
                const orbMat = new THREE.MeshBasicMaterial({
                    color: 0xffaaff,
                    transparent: true,
                    opacity: 0.8
                });
                const orb = new THREE.Mesh(orbGeom, orbMat);
                orb.position.set(
                    (Math.random() - 0.5) * 4,
                    4 + Math.random() * 4,
                    (Math.random() - 0.5) * 4
                );
                orb.userData.floatSpeed = 0.5 + Math.random() * 0.5;
                orb.userData.floatOffset = Math.random() * Math.PI * 2;
                group.add(orb);
            }
        }

        group.position.set(x, height, z);
        this.scene.add(group);
        return { group, position: group.position, radius: 0.5 };
    }

    // Update biome effects (fog, lighting) based on player position
    updateBiomeEffects(playerPosition) {
        const biome = this.getBiomeAt(playerPosition.x, playerPosition.z);

        if (this.currentBiome !== biome.id) {
            this.currentBiome = biome.id;
            this.transitionToBiome(biome);
        }
    }

    transitionToBiome(biome) {
        // Update fog
        this.scene.fog = new THREE.Fog(biome.fogColor, biome.fogNear, biome.fogFar);
        this.scene.background = new THREE.Color(biome.fogColor);

        // Could animate this transition for smoother effect
    }

    // Animate biome-specific elements
    update(time) {
        // Animate magic biome orbs
        this.biomeObjects.magic?.forEach(obj => {
            obj.group?.children?.forEach(child => {
                if (child.userData.floatSpeed) {
                    child.position.y += Math.sin(time * child.userData.floatSpeed + child.userData.floatOffset) * 0.01;
                }
            });
        });

        // Animate water
        this.waterBodies.forEach(water => {
            if (water.mesh) {
                water.mesh.position.y = -0.3 + Math.sin(time * 0.5) * 0.05;
            }
        });
    }

    // Get spawn points for a specific biome
    getSpawnPointsForBiome(biomeId) {
        const zone = this.biomeZones.find(z => z.type.id === biomeId);
        if (!zone) return [];

        const points = [];
        const b = zone.bounds;

        // Generate spawn points
        for (let i = 0; i < 5; i++) {
            let x, z;
            let attempts = 0;
            do {
                x = b.minX + 10 + Math.random() * (b.maxX - b.minX - 20);
                z = b.minZ + 10 + Math.random() * (b.maxZ - b.minZ - 20);
                attempts++;
            } while (this.isInWater(x, z) && attempts < 10);

            points.push({ x, z, biome: biomeId });
        }

        return points;
    }

    // Get all spawn points
    getAllSpawnPoints() {
        return [
            ...this.getSpawnPointsForBiome('forest'),
            ...this.getSpawnPointsForBiome('swamp'),
            ...this.getSpawnPointsForBiome('magic')
        ];
    }
}

// Export
window.BIOME_TYPES = BIOME_TYPES;
window.BiomeManager = BiomeManager;
