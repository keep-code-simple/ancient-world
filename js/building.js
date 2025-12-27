/**
 * Building System - Minecraft-inspired structure construction
 * Grid-based placement with walls, floors, roofs, and doors
 */

const BUILDING_TYPES = {
    FLOOR: {
        id: 'floor',
        name: 'Wooden Floor',
        cost: { wood: 2 },
        size: { x: 2, y: 0.2, z: 2 },
        color: 0x8b7355,
        placementHeight: 0
    },
    WALL: {
        id: 'wall',
        name: 'Wooden Wall',
        cost: { wood: 3 },
        size: { x: 2, y: 3, z: 0.3 },
        color: 0x9c8a6a,
        placementHeight: 1.5
    },
    ROOF: {
        id: 'roof',
        name: 'Wooden Roof',
        cost: { wood: 2, stone: 1 },
        size: { x: 2.5, y: 0.5, z: 2.5 },
        color: 0x6b5344,
        placementHeight: 3.5
    },
    DOOR: {
        id: 'door',
        name: 'Wooden Door',
        cost: { wood: 2 },
        size: { x: 1, y: 2.5, z: 0.2 },
        color: 0x654321,
        placementHeight: 1.25
    },
    STONE_WALL: {
        id: 'stone_wall',
        name: 'Stone Wall',
        cost: { stone: 4 },
        size: { x: 2, y: 3, z: 0.4 },
        color: 0x777777,
        placementHeight: 1.5
    },
    FENCE: {
        id: 'fence',
        name: 'Fence',
        cost: { wood: 1 },
        size: { x: 2, y: 1, z: 0.2 },
        color: 0x8b6914,
        placementHeight: 0.5
    }
};

class BuildingSystem {
    constructor(scene, player, biomeManager) {
        this.scene = scene;
        this.player = player;
        this.biomeManager = biomeManager;

        // Build mode state
        this.isInBuildMode = false;
        this.selectedBuildType = null;
        this.previewMesh = null;

        // Grid settings
        this.gridSize = 2;

        // Placed structures
        this.structures = [];

        // Build range
        this.buildRange = 5;
    }

    // Toggle build mode
    toggleBuildMode() {
        this.isInBuildMode = !this.isInBuildMode;

        if (!this.isInBuildMode) {
            this.clearPreview();
            this.selectedBuildType = null;
        }

        return this.isInBuildMode;
    }

    // Select building type
    selectBuildType(typeId) {
        const type = Object.values(BUILDING_TYPES).find(t => t.id === typeId);
        if (!type) return false;

        this.selectedBuildType = type;
        this.updatePreview();
        return true;
    }

    // Cycle through building types
    cycleBuildType() {
        const types = Object.values(BUILDING_TYPES);
        if (!this.selectedBuildType) {
            this.selectedBuildType = types[0];
        } else {
            const currentIndex = types.findIndex(t => t.id === this.selectedBuildType.id);
            this.selectedBuildType = types[(currentIndex + 1) % types.length];
        }
        this.updatePreview();
        return this.selectedBuildType;
    }

    // Get placement position (snapped to grid)
    getPlacementPosition() {
        // Place in front of player
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.player.mesh.quaternion);
        forward.normalize();

        const placementPos = this.player.position.clone();
        placementPos.add(forward.multiplyScalar(this.buildRange));

        // Snap to grid
        placementPos.x = Math.round(placementPos.x / this.gridSize) * this.gridSize;
        placementPos.z = Math.round(placementPos.z / this.gridSize) * this.gridSize;

        // Get ground height
        if (this.biomeManager) {
            placementPos.y = this.biomeManager.getHeightAt(placementPos.x, placementPos.z);
        }

        if (this.selectedBuildType) {
            placementPos.y += this.selectedBuildType.placementHeight;
        }

        return placementPos;
    }

    // Update preview mesh position
    updatePreview() {
        if (!this.isInBuildMode || !this.selectedBuildType) {
            this.clearPreview();
            return;
        }

        const type = this.selectedBuildType;
        const pos = this.getPlacementPosition();

        // Create or update preview mesh
        if (!this.previewMesh || this.previewMesh.userData.typeId !== type.id) {
            this.clearPreview();

            const geometry = new THREE.BoxGeometry(type.size.x, type.size.y, type.size.z);
            const material = new THREE.MeshBasicMaterial({
                color: type.color,
                transparent: true,
                opacity: 0.5,
                wireframe: false
            });

            this.previewMesh = new THREE.Mesh(geometry, material);
            this.previewMesh.userData.typeId = type.id;
            this.scene.add(this.previewMesh);
        }

        this.previewMesh.position.copy(pos);

        // Rotate wall with player facing
        if (type.id === 'wall' || type.id === 'stone_wall' || type.id === 'door' || type.id === 'fence') {
            this.previewMesh.rotation.y = this.player.mesh.rotation.y;
        }

        // Check if can build
        const canBuild = this.canBuildAt(pos) && this.player.canAfford(type.cost);
        this.previewMesh.material.color.setHex(canBuild ? 0x00ff00 : 0xff0000);
    }

    // Clear preview mesh
    clearPreview() {
        if (this.previewMesh) {
            this.scene.remove(this.previewMesh);
            this.previewMesh.geometry.dispose();
            this.previewMesh.material.dispose();
            this.previewMesh = null;
        }
    }

    // Check if can build at position
    canBuildAt(position) {
        // Check for existing structures
        for (const structure of this.structures) {
            const dx = Math.abs(structure.position.x - position.x);
            const dz = Math.abs(structure.position.z - position.z);

            if (dx < this.gridSize * 0.8 && dz < this.gridSize * 0.8) {
                // Check if same height
                if (Math.abs(structure.position.y - position.y) < 1) {
                    return false;
                }
            }
        }

        // Check for water
        if (this.biomeManager && this.biomeManager.isInWater(position.x, position.z)) {
            return false;
        }

        return true;
    }

    // Place structure
    placeStructure() {
        if (!this.isInBuildMode || !this.selectedBuildType) return false;

        const type = this.selectedBuildType;
        const pos = this.getPlacementPosition();

        // Check if can build
        if (!this.canBuildAt(pos)) return false;
        if (!this.player.canAfford(type.cost)) return false;

        // Spend resources
        this.player.spendResources(type.cost);

        // Create structure mesh
        const geometry = new THREE.BoxGeometry(type.size.x, type.size.y, type.size.z);
        const material = new THREE.MeshStandardMaterial({
            color: type.color,
            roughness: 0.8
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Apply rotation for walls
        if (type.id === 'wall' || type.id === 'stone_wall' || type.id === 'door' || type.id === 'fence') {
            mesh.rotation.y = this.player.mesh.rotation.y;
        }

        this.scene.add(mesh);

        // Track structure
        const structure = {
            mesh: mesh,
            type: type,
            position: pos.clone(),
            rotation: mesh.rotation.y
        };
        this.structures.push(structure);

        return true;
    }

    // Update each frame
    update(deltaTime) {
        if (this.isInBuildMode) {
            this.updatePreview();
        }
    }

    // Get structures for collision
    getCollidables() {
        return this.structures.map(s => ({
            position: s.position,
            radius: Math.max(s.type.size.x, s.type.size.z) / 2
        }));
    }

    // Get current build state for UI
    getBuildState() {
        return {
            isInBuildMode: this.isInBuildMode,
            selectedType: this.selectedBuildType,
            canAfford: this.selectedBuildType ? this.player.canAfford(this.selectedBuildType.cost) : false
        };
    }
}

// Export
window.BUILDING_TYPES = BUILDING_TYPES;
window.BuildingSystem = BuildingSystem;
