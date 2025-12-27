/**
 * World Generator - Creates the game environment
 * Includes terrain, trees, rocks, camps, and special locations
 */

class World {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.collidables = [];
        this.interactables = [];

        // World bounds
        this.bounds = {
            minX: -50,
            maxX: 50,
            minZ: -50,
            maxZ: 50
        };

        this.create();
    }

    create() {
        this.createTerrain();
        this.createLighting();
        this.createEnvironmentObjects();
        this.createEnemyCamp();
        this.createForge();
        this.createRelicShrine();
    }

    createTerrain() {
        // Ground plane with grass texture
        const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);

        // Add some height variation
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            // Skip edges to keep them flat
            const x = vertices[i];
            const z = vertices[i + 1];
            if (Math.abs(x) < 45 && Math.abs(z) < 45) {
                vertices[i + 2] = Math.random() * 0.3;
            }
        }
        groundGeometry.computeVertexNormals();

        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d5c3d,
            roughness: 0.9,
            metalness: 0.1
        });

        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.name = 'ground';
        this.scene.add(ground);

        // Add dirt/path areas
        this.createPath();
    }

    createPath() {
        const pathGeometry = new THREE.PlaneGeometry(4, 60);
        const pathMaterial = new THREE.MeshStandardMaterial({
            color: 0x5c4a3d,
            roughness: 1.0
        });

        const path = new THREE.Mesh(pathGeometry, pathMaterial);
        path.rotation.x = -Math.PI / 2;
        path.position.y = 0.02;
        path.receiveShadow = true;
        this.scene.add(path);
    }

    createLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x404060, 0.5);
        this.scene.add(ambient);

        // Main directional light (sun)
        const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
        sun.position.set(30, 50, 20);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 150;
        sun.shadow.camera.left = -60;
        sun.shadow.camera.right = 60;
        sun.shadow.camera.top = 60;
        sun.shadow.camera.bottom = -60;
        this.scene.add(sun);

        // Secondary fill light
        const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
        fill.position.set(-20, 20, -20);
        this.scene.add(fill);

        // Hemisphere light for environment
        const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3d5c3d, 0.4);
        this.scene.add(hemi);
    }

    createEnvironmentObjects() {
        // Create multiple trees
        const treePositions = [
            { x: -15, z: -20 }, { x: -20, z: -15 }, { x: -25, z: -25 },
            { x: 15, z: -20 }, { x: 20, z: -25 }, { x: 25, z: -15 },
            { x: -15, z: 20 }, { x: -25, z: 25 }, { x: -20, z: 30 },
            { x: 15, z: 25 }, { x: 25, z: 20 }, { x: 30, z: 30 },
            { x: -35, z: 0 }, { x: 35, z: 5 }, { x: 0, z: -35 },
            { x: -40, z: -35 }, { x: 40, z: -40 }, { x: -40, z: 40 }
        ];

        treePositions.forEach(pos => {
            this.createTree(pos.x, pos.z);
        });

        // Create rocks
        const rockPositions = [
            { x: -10, z: 10, scale: 1.5 }, { x: 12, z: -8, scale: 1.0 },
            { x: -8, z: -15, scale: 0.8 }, { x: 5, z: 15, scale: 1.2 },
            { x: -30, z: 10, scale: 2.0 }, { x: 28, z: -12, scale: 1.8 },
            { x: 0, z: 25, scale: 1.0 }, { x: -20, z: -5, scale: 0.7 }
        ];

        rockPositions.forEach(pos => {
            this.createRock(pos.x, pos.z, pos.scale);
        });
    }

    createTree(x, z) {
        const group = new THREE.Group();

        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x5c4a3d,
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        group.add(trunk);

        // Foliage layers
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x228b22,
            roughness: 0.8
        });

        const foliage1 = new THREE.Mesh(
            new THREE.ConeGeometry(2.5, 4, 8),
            foliageMaterial
        );
        foliage1.position.y = 5;
        foliage1.castShadow = true;
        group.add(foliage1);

        const foliage2 = new THREE.Mesh(
            new THREE.ConeGeometry(2, 3, 8),
            foliageMaterial
        );
        foliage2.position.y = 7;
        foliage2.castShadow = true;
        group.add(foliage2);

        const foliage3 = new THREE.Mesh(
            new THREE.ConeGeometry(1.5, 2.5, 8),
            foliageMaterial
        );
        foliage3.position.y = 9;
        foliage3.castShadow = true;
        group.add(foliage3);

        // Random rotation and slight position variation
        group.rotation.y = Math.random() * Math.PI * 2;
        group.position.set(x + (Math.random() - 0.5) * 2, 0, z + (Math.random() - 0.5) * 2);

        // Scale variation
        const scale = 0.8 + Math.random() * 0.4;
        group.scale.set(scale, scale, scale);

        this.scene.add(group);
        this.objects.push(group);

        // Add collision for trunk
        this.collidables.push({
            position: group.position.clone(),
            radius: 0.5
        });
    }

    createRock(x, z, scale) {
        // Use dodecahedron for rocky shape
        const geometry = new THREE.DodecahedronGeometry(scale, 0);
        const material = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.9,
            metalness: 0.1
        });

        const rock = new THREE.Mesh(geometry, material);
        rock.position.set(x, scale * 0.5, z);
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        rock.castShadow = true;
        rock.receiveShadow = true;

        this.scene.add(rock);
        this.objects.push(rock);

        // Add collision
        this.collidables.push({
            position: rock.position.clone(),
            radius: scale
        });
    }

    createEnemyCamp() {
        const campGroup = new THREE.Group();
        campGroup.position.set(25, 0, 25);

        // Tent
        const tentGeometry = new THREE.ConeGeometry(3, 4, 4);
        const tentMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.8
        });
        const tent = new THREE.Mesh(tentGeometry, tentMaterial);
        tent.position.y = 2;
        tent.rotation.y = Math.PI / 4;
        tent.castShadow = true;
        campGroup.add(tent);

        // Campfire
        const fireBase = new THREE.Mesh(
            new THREE.CylinderGeometry(1, 1.2, 0.3, 12),
            new THREE.MeshStandardMaterial({ color: 0x555555 })
        );
        fireBase.position.set(-4, 0.15, 2);
        campGroup.add(fireBase);

        // Fire glow
        const fireLight = new THREE.PointLight(0xff6600, 2, 10);
        fireLight.position.set(-4, 1.5, 2);
        campGroup.add(fireLight);

        // Fire particles (simple cones)
        const fireMaterial = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        for (let i = 0; i < 3; i++) {
            const flame = new THREE.Mesh(
                new THREE.ConeGeometry(0.3, 1 + Math.random() * 0.5, 6),
                fireMaterial
            );
            flame.position.set(-4 + (Math.random() - 0.5) * 0.5, 0.8, 2 + (Math.random() - 0.5) * 0.5);
            campGroup.add(flame);
        }

        // Crates
        const crateMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
        for (let i = 0; i < 3; i++) {
            const crate = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.8, 0.8),
                crateMaterial
            );
            crate.position.set(3 + i * 0.9, 0.4, -2);
            crate.rotation.y = Math.random() * 0.3;
            crate.castShadow = true;
            campGroup.add(crate);
        }

        this.scene.add(campGroup);
        this.objects.push(campGroup);

        // Camp spawn point for enemies
        this.enemySpawnPoints = this.enemySpawnPoints || [];
        this.enemySpawnPoints.push({ x: 25, z: 25, type: 'camp' });
    }

    createForge() {
        const forgeGroup = new THREE.Group();
        forgeGroup.position.set(-30, 0, 0);

        // Anvil
        const anvilBase = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 1, 1),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 })
        );
        anvilBase.position.y = 0.5;
        forgeGroup.add(anvilBase);

        const anvilTop = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.3, 0.8),
            new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9 })
        );
        anvilTop.position.y = 1.15;
        forgeGroup.add(anvilTop);

        // Forge furnace
        const furnace = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2.5, 2),
            new THREE.MeshStandardMaterial({ color: 0x8b4513 })
        );
        furnace.position.set(2, 1.25, 0);
        forgeGroup.add(furnace);

        // Forge glow
        const forgeLight = new THREE.PointLight(0xff4400, 1.5, 8);
        forgeLight.position.set(2, 1.5, 0);
        forgeGroup.add(forgeLight);

        // Forge opening glow
        const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        const forgeOpening = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            glowMaterial
        );
        forgeOpening.position.set(1, 1, 0);
        forgeOpening.rotation.y = Math.PI / 2;
        forgeGroup.add(forgeOpening);

        // Marker
        const marker = this.createInteractableMarker(0xf97316);
        marker.position.y = 4;
        forgeGroup.add(marker);

        this.scene.add(forgeGroup);
        this.objects.push(forgeGroup);

        this.interactables.push({
            position: forgeGroup.position.clone(),
            radius: 4,
            type: 'forge',
            group: forgeGroup
        });
    }

    createRelicShrine() {
        const shrineGroup = new THREE.Group();
        shrineGroup.position.set(-30, 0, 30);

        // Base platform
        const platform = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 3.5, 0.5, 8),
            new THREE.MeshStandardMaterial({ color: 0x666677 })
        );
        platform.position.y = 0.25;
        shrineGroup.add(platform);

        // Pillars
        const pillarMaterial = new THREE.MeshStandardMaterial({ color: 0x8888aa });
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const pillar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.25, 3, 6),
                pillarMaterial
            );
            pillar.position.set(
                Math.cos(angle) * 2.5,
                1.75,
                Math.sin(angle) * 2.5
            );
            pillar.castShadow = true;
            shrineGroup.add(pillar);
        }

        // Relic pedestal
        const pedestal = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.5, 1.5, 8),
            new THREE.MeshStandardMaterial({ color: 0x9999bb })
        );
        pedestal.position.y = 1.25;
        shrineGroup.add(pedestal);

        // Floating relic
        const relicGeometry = new THREE.OctahedronGeometry(0.5, 0);
        const relicMaterial = new THREE.MeshStandardMaterial({
            color: 0xa855f7,
            emissive: 0x5500aa,
            emissiveIntensity: 0.5,
            metalness: 0.8
        });
        const relic = new THREE.Mesh(relicGeometry, relicMaterial);
        relic.position.y = 2.5;
        relic.userData.floatOffset = 0;
        shrineGroup.add(relic);
        this.floatingRelic = relic;

        // Relic glow light
        const relicLight = new THREE.PointLight(0xa855f7, 1.5, 8);
        relicLight.position.set(0, 2.5, 0);
        shrineGroup.add(relicLight);

        // Marker
        const marker = this.createInteractableMarker(0xa855f7);
        marker.position.y = 5;
        shrineGroup.add(marker);

        this.scene.add(shrineGroup);
        this.objects.push(shrineGroup);

        this.interactables.push({
            position: shrineGroup.position.clone(),
            radius: 4,
            type: 'shrine',
            group: shrineGroup
        });
    }

    createInteractableMarker(color) {
        const group = new THREE.Group();

        // Diamond shape marker
        const markerGeom = new THREE.OctahedronGeometry(0.5, 0);
        const markerMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        const marker = new THREE.Mesh(markerGeom, markerMat);
        group.add(marker);

        // Glow ring
        const ringGeom = new THREE.TorusGeometry(0.8, 0.1, 8, 16);
        const ringMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        group.userData.marker = marker;
        group.userData.ring = ring;

        return group;
    }

    // Update animated objects
    update(time) {
        // Animate floating relic
        if (this.floatingRelic) {
            this.floatingRelic.rotation.y = time * 0.5;
            this.floatingRelic.position.y = 2.5 + Math.sin(time * 2) * 0.2;
        }

        // Animate markers
        this.interactables.forEach(interactable => {
            if (interactable.group) {
                const marker = interactable.group.children.find(c => c.userData.marker);
                if (marker) {
                    marker.rotation.y = time;
                    marker.userData.ring.rotation.z = time * 0.5;
                }
            }
        });
    }

    // Check collision with world objects
    checkCollision(position, radius) {
        for (const obj of this.collidables) {
            const dx = position.x - obj.position.x;
            const dz = position.z - obj.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < radius + obj.radius) {
                return true;
            }
        }

        // Check world bounds
        if (position.x < this.bounds.minX + radius || position.x > this.bounds.maxX - radius ||
            position.z < this.bounds.minZ + radius || position.z > this.bounds.maxZ - radius) {
            return true;
        }

        return false;
    }

    // Get nearby interactable
    getNearbyInteractable(position) {
        for (const interactable of this.interactables) {
            const dx = position.x - interactable.position.x;
            const dz = position.z - interactable.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < interactable.radius) {
                return interactable;
            }
        }
        return null;
    }

    // Get enemy spawn points
    getSpawnPoints() {
        return this.enemySpawnPoints || [];
    }
}

// Export for use in other modules
window.World = World;
