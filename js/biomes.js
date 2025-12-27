/**
 * Biome System - Real-world inspired biomes + Magic biome
 * Iteration 3: Forest, Plains, Mountains, Desert, Magic
 */

// Biome type definitions
const BIOME_TYPES = {
    FOREST: {
        id: 'forest',
        name: 'Ancient Forest',
        groundColor: 0x2d5a27,
        fogColor: 0x87ceeb,
        fogNear: 50,
        fogFar: 120,
        ambientColor: 0x405540,
        ambientIntensity: 0.5,
        treeTypes: ['pine', 'oak'],
        treeDensity: 0.9,
        hasWater: false,
        resources: ['wood', 'stone'],
        enemyTypes: ['goblin', 'orc', 'skeleton'],
        creatureTypes: ['wolf'],
        music: 'forest_ambient'
    },
    PLAINS: {
        id: 'plains',
        name: 'Golden Plains',
        groundColor: 0x8b9a5b,
        fogColor: 0xc5e3ff,
        fogNear: 60,
        fogFar: 150,
        ambientColor: 0x606050,
        ambientIntensity: 0.6,
        treeTypes: [],
        treeDensity: 0.1,
        hasWater: false,
        resources: ['stone', 'clay'],
        enemyTypes: ['bandit', 'wolf'],
        creatureTypes: [],
        music: 'plains_ambient'
    },
    MOUNTAINS: {
        id: 'mountains',
        name: 'Stone Peaks',
        groundColor: 0x6a6a6a,
        fogColor: 0xaabbcc,
        fogNear: 40,
        fogFar: 100,
        ambientColor: 0x505560,
        ambientIntensity: 0.4,
        treeTypes: ['pine'],
        treeDensity: 0.3,
        hasWater: false,
        resources: ['stone', 'ore', 'crystal'],
        enemyTypes: ['golem', 'troll'],
        creatureTypes: [],
        music: 'mountain_ambient'
    },
    DESERT: {
        id: 'desert',
        name: 'Burning Sands',
        groundColor: 0xd4a574,
        fogColor: 0xf5e6c8,
        fogNear: 50,
        fogFar: 140,
        ambientColor: 0x706040,
        ambientIntensity: 0.7,
        treeTypes: ['cactus', 'dead'],
        treeDensity: 0.15,
        hasWater: false,
        resources: ['sand', 'gold'],
        enemyTypes: ['scorpion', 'mummy'],
        creatureTypes: [],
        music: 'desert_ambient'
    },
    MAGIC: {
        id: 'magic',
        name: 'Arcane Realm',
        groundColor: 0x4a3a6a,
        fogColor: 0x9b7bcb,
        fogNear: 35,
        fogFar: 90,
        ambientColor: 0x6040a0,
        ambientIntensity: 0.6,
        treeTypes: ['crystal', 'ancient'],
        treeDensity: 0.5,
        hasWater: true, // Magical pools - still hazardous
        waterColor: 0x6a4a8a,
        resources: ['crystal', 'magic_shard'],
        enemyTypes: ['wisp', 'corrupted_golem'],
        creatureTypes: ['fairy', 'phoenix', 'dragon'],
        music: 'magic_ambient'
    }
};

class BiomeManager {
    constructor(scene) {
        this.scene = scene;
        this.currentBiome = null;

        // World size (larger world for more biomes)
        this.worldSize = 200;

        // Define biome zones (5 biomes in a pattern)
        this.biomeZones = [
            // Forest - center starting area
            {
                type: BIOME_TYPES.FOREST,
                bounds: { minX: -50, maxX: 50, minZ: -100, maxZ: 0 },
                center: { x: 0, z: -50 }
            },
            // Plains - east
            {
                type: BIOME_TYPES.PLAINS,
                bounds: { minX: 50, maxX: 100, minZ: -100, maxZ: 50 },
                center: { x: 75, z: -25 }
            },
            // Mountains - west
            {
                type: BIOME_TYPES.MOUNTAINS,
                bounds: { minX: -100, maxX: -50, minZ: -100, maxZ: 50 },
                center: { x: -75, z: -25 }
            },
            // Desert - south
            {
                type: BIOME_TYPES.DESERT,
                bounds: { minX: -50, maxX: 50, minZ: 0, maxZ: 50 },
                center: { x: 0, z: 25 }
            },
            // Magic - far north (dangerous end-game area)
            {
                type: BIOME_TYPES.MAGIC,
                bounds: { minX: -100, maxX: 100, minZ: 50, maxZ: 100 },
                center: { x: 0, z: 75 }
            }
        ];

        // Water bodies (hazardous - only in magic biome now)
        this.waterBodies = [];

        // Height map for terrain
        this.heightMap = new Map();

        // Harvestable resources
        this.resources = [];
        this.resourceRespawnTime = 30; // seconds

        // Biome-specific objects
        this.biomeObjects = {
            forest: [],
            plains: [],
            mountains: [],
            desert: [],
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

    // Check if position is in water (magic pools - hazardous)
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
                return (1 - dist / water.radius) * water.depth;
            }
        }
        return 0;
    }

    // Get terrain height at position - Enhanced for better readability
    getHeightAt(x, z) {
        const key = `${Math.floor(x / 5)}_${Math.floor(z / 5)}`;
        if (this.heightMap.has(key)) {
            return this.heightMap.get(key);
        }

        // Get biome at this position
        const biome = this.getBiomeAt(x, z);
        let height = 0;

        // Multi-octave noise function for natural terrain
        const noise = (px, pz, octaves = 3) => {
            let value = 0;
            let amplitude = 1;
            let frequency = 1;
            let maxValue = 0;

            for (let i = 0; i < octaves; i++) {
                value += Math.sin(px * 0.05 * frequency) * Math.cos(pz * 0.05 * frequency) * amplitude;
                value += Math.sin((px + 100) * 0.08 * frequency) * Math.sin((pz + 100) * 0.08 * frequency) * amplitude * 0.5;
                maxValue += amplitude;
                amplitude *= 0.5;
                frequency *= 2;
            }
            return value / maxValue;
        };

        // Ridge function for mountain peaks
        const ridge = (px, pz) => {
            let n = Math.sin(px * 0.06) * Math.cos(pz * 0.06);
            return 1 - Math.abs(n) * 2; // Creates ridge-like formations
        };

        if (biome.id === 'mountains') {
            // Dramatic mountain terrain with peaks, ridges, and valleys
            const baseHeight = noise(x, z, 4) * 12;
            const ridgeHeight = ridge(x, z) * 8;
            const peaks = Math.pow(Math.max(0, noise(x * 1.5, z * 1.5, 2)), 2) * 10;

            // Add plateau formations at certain heights
            height = baseHeight + ridgeHeight + peaks;

            // Create terraced/plateau effect
            const terraceHeight = 5;
            height = Math.floor(height / terraceHeight) * terraceHeight +
                (height % terraceHeight) * 0.3;

            // Ensure minimum base height for mountains
            height = Math.max(2, height);

        } else if (biome.id === 'magic') {
            // Floating island effect with mystical undulation
            const baseWave = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3;
            const floatIslands = Math.pow(Math.max(0, noise(x * 0.8, z * 0.8, 2)), 2) * 6;
            height = baseWave + floatIslands;

        } else if (biome.id === 'desert') {
            // Sand dunes with realistic wave patterns
            const mainDunes = Math.sin(x * 0.04 + z * 0.02) * 3;
            const secondaryDunes = Math.sin(x * 0.08 - z * 0.06) * 1.5;
            const ripples = Math.sin(x * 0.2) * Math.sin(z * 0.15) * 0.5;
            height = mainDunes + secondaryDunes + ripples;

        } else if (biome.id === 'plains') {
            // Gentle rolling hills - mostly flat with subtle variation
            height = noise(x, z, 2) * 1.5;

        } else {
            // Forest - moderate hills with some variation
            const hills = noise(x, z, 3) * 4;
            const gullies = Math.min(0, Math.sin(x * 0.15) * Math.sin(z * 0.12)) * 2;
            height = hills + gullies;
        }

        this.heightMap.set(key, height);
        return height;
    }

    // Create terrain for all biomes - Enhanced with slope shading and elevation colors
    createTerrain() {
        const segments = 100; // Increased for smoother terrain
        const geometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize, segments, segments);

        // Modify vertices for height and color per biome
        const positions = geometry.attributes.position.array;
        const colors = new Float32Array(positions.length);

        // First pass: set heights
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 1];
            positions[i + 2] = this.getHeightAt(x, z);
        }

        // Compute normals after height assignment for accurate slope calculation
        geometry.computeVertexNormals();
        const normals = geometry.attributes.normal.array;

        // Sun direction for shading (normalized)
        const sunDir = new THREE.Vector3(0.5, 0.8, 0.3).normalize();

        // Second pass: set colors with slope shading and elevation gradients
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 1];
            const height = positions[i + 2];

            // Get normal for this vertex (slope direction)
            const normal = new THREE.Vector3(normals[i], normals[i + 1], normals[i + 2]);

            // Calculate slope shading based on normal dot sun direction
            const slopeShading = Math.max(0.4, normal.dot(sunDir));

            // Get biome and compute elevation-based color
            const biome = this.getBiomeAt(x, z);
            const color = this.getElevationColor(biome, height, slopeShading);

            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.85,
            metalness: 0.05
        });

        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        terrain.castShadow = true; // Terrain casts shadows for depth
        terrain.name = 'terrain';

        this.scene.add(terrain);
        this.terrain = terrain;

        return terrain;
    }

    // Get elevation-based color with slope shading
    getElevationColor(biome, height, slopeShading) {
        let color = new THREE.Color();

        // Elevation thresholds for color bands
        const lowThreshold = 3;
        const midThreshold = 10;
        const highThreshold = 18;

        if (biome.id === 'mountains') {
            // Mountains: rock grey → darker rock → snow white
            if (height > highThreshold) {
                // Snow caps
                color.setHex(0xf0f5ff);
            } else if (height > midThreshold) {
                // High rock with snow patches
                const t = (height - midThreshold) / (highThreshold - midThreshold);
                color.setHex(0x7a7a7a).lerp(new THREE.Color(0xd0d8e0), t);
            } else if (height > lowThreshold) {
                // Mid-level rock
                const t = (height - lowThreshold) / (midThreshold - lowThreshold);
                color.setHex(0x5a5a5a).lerp(new THREE.Color(0x7a7a7a), t);
            } else {
                // Base rock/gravel
                color.setHex(0x4a4a4a);
            }
        } else if (biome.id === 'forest') {
            // Forest: dark green valleys → lighter green hills
            const t = Math.max(0, Math.min(1, (height + 4) / 8));
            color.setHex(0x1a3a1a).lerp(new THREE.Color(0x3d6a3d), t);
        } else if (biome.id === 'plains') {
            // Plains: golden grass with subtle height variation
            const t = Math.max(0, Math.min(1, (height + 2) / 4));
            color.setHex(0x7a8a4a).lerp(new THREE.Color(0x9aaa6a), t);
        } else if (biome.id === 'desert') {
            // Desert: darker in troughs, lighter on dune crests
            const t = Math.max(0, Math.min(1, (height + 5) / 10));
            color.setHex(0xa08050).lerp(new THREE.Color(0xd4b584), t);
        } else if (biome.id === 'magic') {
            // Magic: deep purple valleys → glowing lighter purple
            const t = Math.max(0, Math.min(1, (height + 3) / 9));
            color.setHex(0x3a2a4a).lerp(new THREE.Color(0x6a5a8a), t);
            // Add slight emissive glow effect through brighter colors
            color.r = Math.min(1, color.r * 1.1);
            color.b = Math.min(1, color.b * 1.15);
        } else {
            // Default biome color
            color.setHex(biome.groundColor);
        }

        // Apply slope shading (darker on north slopes, lighter on south)
        color.r *= slopeShading;
        color.g *= slopeShading;
        color.b *= slopeShading;

        // Add subtle noise for texture
        const noise = (Math.random() - 0.5) * 0.04;
        color.r = Math.max(0, Math.min(1, color.r + noise));
        color.g = Math.max(0, Math.min(1, color.g + noise));
        color.b = Math.max(0, Math.min(1, color.b + noise));

        // Add contour lines effect (subtle darkening at elevation intervals)
        const contourInterval = 4;
        const contourProximity = Math.abs(height % contourInterval);
        if (contourProximity < 0.3) {
            const contourDarken = 0.92;
            color.r *= contourDarken;
            color.g *= contourDarken;
            color.b *= contourDarken;
        }

        return color;
    }

    // Create water bodies (magic pools only - hazardous)
    createWaterBodies() {
        const magicZone = this.biomeZones.find(z => z.type.id === 'magic');
        if (!magicZone) return;

        // Create magical pools in magic biome only
        this.createWaterBody(0, 70, 10, 2);
        this.createWaterBody(-30, 80, 6, 1.5);
        this.createWaterBody(30, 75, 8, 2);
    }

    createWaterBody(x, z, radius, depth) {
        // Hazardous water - glowing danger
        const geometry = new THREE.CircleGeometry(radius, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0x6a4a8a,
            transparent: true,
            opacity: 0.8,
            emissive: 0x4a2a6a,
            emissiveIntensity: 0.3
        });

        const water = new THREE.Mesh(geometry, material);
        water.rotation.x = -Math.PI / 2;
        water.position.set(x, -0.2, z);
        water.receiveShadow = true;
        water.name = 'water_hazard';

        this.scene.add(water);

        // Track water body
        this.waterBodies.push({ x, z, radius, depth, mesh: water });

        // Warning glow ring
        const glowGeometry = new THREE.RingGeometry(radius, radius + 1, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.rotation.x = -Math.PI / 2;
        glow.position.set(x, 0.1, z);
        this.scene.add(glow);
    }

    // Create biome-specific environment objects
    createBiomeEnvironment(biomeType, objectsArray) {
        const zone = this.biomeZones.find(z => z.type.id === biomeType);
        if (!zone) return [];

        const objects = [];
        const b = zone.bounds;

        // Generate trees/objects based on density
        const count = Math.floor(zone.type.treeDensity * 40);

        for (let i = 0; i < count; i++) {
            const x = b.minX + 5 + Math.random() * (b.maxX - b.minX - 10);
            const z = b.minZ + 5 + Math.random() * (b.maxZ - b.minZ - 10);

            // Don't place in water
            if (this.isInWater(x, z)) continue;

            const treeType = zone.type.treeTypes.length > 0
                ? zone.type.treeTypes[Math.floor(Math.random() * zone.type.treeTypes.length)]
                : null;

            if (treeType) {
                const tree = this.createBiomeTree(x, z, treeType, biomeType);
                if (tree) {
                    objects.push(tree);
                    objectsArray.push(tree);
                }
            }

            // Also place rocks in mountains
            if (biomeType === 'mountains' && Math.random() < 0.3) {
                this.createRock(x + 3, z + 3, objectsArray);
            }
        }

        // Create harvestable resources
        this.createBiomeResources(biomeType);

        this.biomeObjects[biomeType] = objects;
        return objects;
    }

    createBiomeTree(x, z, treeType, biomeType) {
        const height = this.getHeightAt(x, z);

        switch (biomeType) {
            case 'forest':
                return this.createForestTree(x, z, height, treeType);
            case 'mountains':
                return this.createMountainTree(x, z, height, treeType);
            case 'desert':
                return this.createDesertPlant(x, z, height, treeType);
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

        // Mark as harvestable
        group.userData.harvestable = true;
        group.userData.resourceType = 'wood';
        group.userData.resourceAmount = 3;

        this.scene.add(group);
        return { group, position: group.position, radius: 0.5 };
    }

    createMountainTree(x, z, height, type) {
        const group = new THREE.Group();

        // Smaller, hardier pine
        const trunkGeom = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2d });
        const trunk = new THREE.Mesh(trunkGeom, trunkMat);
        trunk.position.y = 1;
        trunk.castShadow = true;
        group.add(trunk);

        const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1a3a17 });
        const foliage = new THREE.Mesh(
            new THREE.ConeGeometry(1.2, 2.5, 6),
            foliageMat
        );
        foliage.position.y = 3;
        foliage.castShadow = true;
        group.add(foliage);

        group.position.set(x, height, z);
        group.scale.setScalar(0.6 + Math.random() * 0.4);

        group.userData.harvestable = true;
        group.userData.resourceType = 'wood';
        group.userData.resourceAmount = 2;

        this.scene.add(group);
        return { group, position: group.position, radius: 0.3 };
    }

    createDesertPlant(x, z, height, type) {
        const group = new THREE.Group();

        if (type === 'cactus') {
            // Cactus
            const cactusMat = new THREE.MeshStandardMaterial({ color: 0x3a5a3a });
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.4, 2, 8),
                cactusMat
            );
            body.position.y = 1;
            body.castShadow = true;
            group.add(body);

            // Arms
            const arm = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.2, 1, 6),
                cactusMat
            );
            arm.position.set(0.5, 1.5, 0);
            arm.rotation.z = -Math.PI / 4;
            group.add(arm);
        } else {
            // Dead tree
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a5a4a });
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.25, 2, 5),
                trunkMat
            );
            trunk.position.y = 1;
            trunk.rotation.z = (Math.random() - 0.5) * 0.3;
            group.add(trunk);
        }

        group.position.set(x, height, z);
        group.scale.setScalar(0.8 + Math.random() * 0.4);

        this.scene.add(group);
        return { group, position: group.position, radius: 0.3 };
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

            group.userData.harvestable = true;
            group.userData.resourceType = 'crystal';
            group.userData.resourceAmount = 2;
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

            group.userData.harvestable = true;
            group.userData.resourceType = 'magic_shard';
            group.userData.resourceAmount = 1;
        }

        group.position.set(x, height, z);
        this.scene.add(group);
        return { group, position: group.position, radius: 0.5 };
    }

    createRock(x, z, objectsArray) {
        const height = this.getHeightAt(x, z);
        const scale = 0.5 + Math.random() * 1.5;

        const geometry = new THREE.DodecahedronGeometry(scale, 0);
        const material = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.9
        });

        const rock = new THREE.Mesh(geometry, material);
        rock.position.set(x, height + scale * 0.5, z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;

        rock.userData.harvestable = true;
        rock.userData.resourceType = 'stone';
        rock.userData.resourceAmount = 2;

        this.scene.add(rock);
        objectsArray.push({ group: rock, position: rock.position, radius: scale });
    }

    // Create harvestable resources for a biome
    createBiomeResources(biomeType) {
        const zone = this.biomeZones.find(z => z.type.id === biomeType);
        if (!zone) return;

        const b = zone.bounds;
        const resourceCount = 10;

        for (let i = 0; i < resourceCount; i++) {
            const x = b.minX + 10 + Math.random() * (b.maxX - b.minX - 20);
            const z = b.minZ + 10 + Math.random() * (b.maxZ - b.minZ - 20);
            const height = this.getHeightAt(x, z);

            // Create ore/resource node
            const resource = this.createResourceNode(x, z, height, zone.type.resources);
            if (resource) {
                this.resources.push(resource);
            }
        }
    }

    createResourceNode(x, z, height, resourceTypes) {
        if (resourceTypes.length === 0) return null;

        const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];

        let color, emissive, size;
        switch (resourceType) {
            case 'ore':
                color = 0x884422;
                emissive = 0x442211;
                size = 0.6;
                break;
            case 'crystal':
                color = 0x9b59b6;
                emissive = 0x6b2996;
                size = 0.5;
                break;
            case 'gold':
                color = 0xffd700;
                emissive = 0x886600;
                size = 0.4;
                break;
            default:
                color = 0x888888;
                emissive = 0x222222;
                size = 0.5;
        }

        const geometry = new THREE.OctahedronGeometry(size, 0);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: emissive,
            emissiveIntensity: 0.2
        });

        const node = new THREE.Mesh(geometry, material);
        node.position.set(x, height + size, z);
        node.rotation.y = Math.random() * Math.PI;
        node.castShadow = true;

        node.userData.harvestable = true;
        node.userData.resourceType = resourceType;
        node.userData.resourceAmount = 1 + Math.floor(Math.random() * 2);

        this.scene.add(node);

        return {
            mesh: node,
            position: node.position,
            type: resourceType,
            respawnTimer: 0,
            harvested: false
        };
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
        this.scene.fog = new THREE.Fog(biome.fogColor, biome.fogNear, biome.fogFar);
        this.scene.background = new THREE.Color(biome.fogColor);
    }

    // Animate biome-specific elements
    update(time, deltaTime) {
        // Animate magic biome elements
        this.biomeObjects.magic?.forEach(obj => {
            if (obj.group) {
                obj.group.children?.forEach(child => {
                    if (child.userData.floatSpeed) {
                        child.position.y += Math.sin(time * child.userData.floatSpeed) * 0.01;
                    }
                });
            }
        });

        // Animate water hazards
        this.waterBodies.forEach(water => {
            if (water.mesh) {
                water.mesh.position.y = -0.2 + Math.sin(time * 0.5) * 0.05;
                water.mesh.material.emissiveIntensity = 0.3 + Math.sin(time * 2) * 0.1;
            }
        });

        // Respawn harvested resources
        if (deltaTime) {
            this.resources.forEach(resource => {
                if (resource.harvested) {
                    resource.respawnTimer += deltaTime;
                    if (resource.respawnTimer >= this.resourceRespawnTime) {
                        resource.harvested = false;
                        resource.respawnTimer = 0;
                        if (resource.mesh) {
                            resource.mesh.visible = true;
                        }
                    }
                }
            });
        }
    }

    // Get spawn points for a specific biome
    getSpawnPointsForBiome(biomeId) {
        const zone = this.biomeZones.find(z => z.type.id === biomeId);
        if (!zone) return [];

        const points = [];
        const b = zone.bounds;

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

    // Get nearby harvestable resource
    getNearbyResource(position, range = 3) {
        for (const resource of this.resources) {
            if (resource.harvested) continue;

            const dx = resource.position.x - position.x;
            const dz = resource.position.z - position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < range) {
                return resource;
            }
        }
        return null;
    }

    // Harvest a resource
    harvestResource(resource) {
        if (!resource || resource.harvested) return null;

        resource.harvested = true;
        resource.respawnTimer = 0;
        if (resource.mesh) {
            resource.mesh.visible = false;
        }

        return {
            type: resource.type,
            amount: resource.mesh?.userData?.resourceAmount || 1
        };
    }

    // Get all spawn points
    getAllSpawnPoints() {
        return [
            ...this.getSpawnPointsForBiome('forest'),
            ...this.getSpawnPointsForBiome('plains'),
            ...this.getSpawnPointsForBiome('mountains'),
            ...this.getSpawnPointsForBiome('desert'),
            ...this.getSpawnPointsForBiome('magic')
        ];
    }
}

// Export
window.BIOME_TYPES = BIOME_TYPES;
window.BiomeManager = BiomeManager;
