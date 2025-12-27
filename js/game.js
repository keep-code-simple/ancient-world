/**
 * Main Game Controller - Orchestrates all game systems
 * Ancient World - Medieval Adventure Game (Iteration 3)
 * Features: Biomes, Building, Dragon Pet, Companion Kill Tracking
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.isPaused = false;

        // Biome tracking
        this.currentBiomeName = '';
        this.biomeChangeTimer = 0;

        // Kill tracking (unified)
        this.totalKills = 0;

        // Dragon pet status
        this.hasDragon = false;
        this.dragonPet = null;

        // Initialize Three.js
        this.initRenderer();
        this.initScene();

        // Initialize game systems
        this.initSystems();

        // Setup input handlers
        this.setupInputHandlers();

        // Start game
        this.start();
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            powerPreference: 'high-performance'
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        window.addEventListener('resize', () => this.onResize());
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, 50, 130);

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            350
        );
    }

    initSystems() {
        // Input
        this.input = new InputHandler();

        // Biome Manager
        this.biomeManager = new BiomeManager(this.scene);

        // World
        this.world = new World(this.scene, this.biomeManager);

        // Create biome terrain and environment
        this.biomeManager.createTerrain();
        this.biomeManager.createWaterBodies();

        // Create biome environments
        ['forest', 'plains', 'mountains', 'desert', 'magic'].forEach(biome => {
            this.biomeManager.createBiomeEnvironment(biome, this.world.collidables);
        });

        // Player (spawn in forest)
        this.player = new Player(this.scene, { x: 0, z: -50 });
        this.player.setBiomeManager(this.biomeManager);

        // Camera controller
        this.cameraController = new ThirdPersonCamera(this.camera, this.player.mesh);

        // Building System
        this.buildingSystem = new BuildingSystem(this.scene, this.player, this.biomeManager);

        // Companion
        this.companion = new Companion(this.scene, this.player);

        // Set companion kill callback - companion kills count for player
        this.companion.setOnKillCallback((enemy) => {
            this.onEnemyKilled(enemy, true);
        });

        // Enemies
        this.enemies = new EnemyManager(this.scene);
        this.enemies.setBiomeManager(this.biomeManager);
        this.spawnBiomeEnemies();

        // Creatures
        this.creatures = new CreatureManager(this.scene, this.biomeManager);
        this.creatures.spawnInitial();

        // Combat
        this.combat = new CombatSystem(this);

        // Loot
        this.lootSystem = new LootSystem(this.scene);

        // Progression
        this.progression = new ProgressionSystem(this);

        // UI
        this.ui = new UISystem();

        // Mouse wheel for camera zoom
        window.addEventListener('wheel', (e) => {
            this.cameraController.zoom(e.deltaY);
        });
    }

    setupInputHandlers() {
        // Build mode toggle (B key)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyB') {
                this.toggleBuildMode();
            }
            if (e.code === 'KeyF' && this.buildingSystem.isInBuildMode) {
                this.buildingSystem.placeStructure();
            }
            if (e.code === 'Tab' && this.buildingSystem.isInBuildMode) {
                e.preventDefault();
                this.cycleBuildType();
            }
        });

        // Touch build button
        const buildBtn = document.getElementById('build-btn');
        if (buildBtn) {
            buildBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.toggleBuildMode();
            });
        }

        const cycleBuildBtn = document.getElementById('cycle-build-btn');
        if (cycleBuildBtn) {
            cycleBuildBtn.addEventListener('click', () => this.cycleBuildType());
        }

        const placeBuildBtn = document.getElementById('place-build-btn');
        if (placeBuildBtn) {
            placeBuildBtn.addEventListener('click', () => {
                this.buildingSystem.placeStructure();
            });
        }
    }

    toggleBuildMode() {
        const isBuilding = this.buildingSystem.toggleBuildMode();
        const buildUI = document.getElementById('build-ui');
        if (buildUI) {
            buildUI.classList.toggle('hidden', !isBuilding);
        }
        if (isBuilding) {
            this.buildingSystem.selectBuildType('floor');
            this.updateBuildUI();
        }
    }

    cycleBuildType() {
        const type = this.buildingSystem.cycleBuildType();
        this.updateBuildUI();
    }

    updateBuildUI() {
        const type = this.buildingSystem.selectedBuildType;
        if (!type) return;

        const buildTypeEl = document.getElementById('build-type');
        const buildCostEl = document.getElementById('build-cost');

        if (buildTypeEl) {
            buildTypeEl.textContent = `Select: ${type.name}`;
        }
        if (buildCostEl) {
            const costs = Object.entries(type.cost)
                .map(([res, amt]) => `${amt} ${res}`)
                .join(', ');
            buildCostEl.textContent = `Cost: ${costs}`;
        }
    }

    spawnBiomeEnemies() {
        const enemySpawns = [
            { biome: 'forest', types: ['goblin', 'orc', 'skeleton'] },
            { biome: 'plains', types: ['goblin', 'skeleton'] },
            { biome: 'mountains', types: ['orc', 'corrupted_golem'] },
            { biome: 'desert', types: ['skeleton', 'goblin'] },
            { biome: 'magic', types: ['wisp', 'corrupted_golem'] }
        ];

        enemySpawns.forEach(spawn => {
            const points = this.biomeManager.getSpawnPointsForBiome(spawn.biome);
            points.forEach((p, i) => {
                this.enemies.spawn(p.x, p.z, spawn.types[i % spawn.types.length]);
            });
        });
    }

    onEnemyKilled(enemy, byCompanion = false) {
        this.totalKills++;

        // Grant XP to player
        if (enemy.xpValue) {
            this.player.gainXP(enemy.xpValue);
        }

        // Drop loot
        const loot = enemy.getLoot();
        loot.forEach(item => {
            this.lootSystem.spawn(enemy.position, item.type, item.amount);
        });

        // Check for dragon unlock (kill enemies in magic biome)
        if (!this.hasDragon && this.biomeManager.getBiomeAt(enemy.position.x, enemy.position.z).id === 'magic') {
            if (this.totalKills >= 10) {
                this.unlockDragon();
            }
        }

        // Update UI
        this.updateKillsUI();
    }

    unlockDragon() {
        if (this.hasDragon) return;

        this.hasDragon = true;

        // Spawn dragon near player in magic biome
        this.dragonPet = this.creatures.spawn(
            this.player.position.x + 3,
            this.player.position.z + 3,
            'dragon'
        );

        // Show notification (could use UI system)
        console.log('Dragon pet unlocked!');
    }

    start() {
        this.isRunning = true;

        setTimeout(() => {
            this.ui.hideLoadingScreen();
        }, 2000);

        this.gameLoop();
    }

    gameLoop() {
        if (!this.isRunning) return;

        requestAnimationFrame(() => this.gameLoop());

        if (this.isPaused) return;

        const deltaTime = Math.min(this.clock.getDelta(), 0.1);
        const time = this.clock.getElapsedTime();

        this.update(deltaTime, time);
        this.render();
    }

    update(deltaTime, time) {
        const movement = this.input.getMovement();
        const cameraRotation = this.input.getCameraRotation();

        this.cameraController.rotate(cameraRotation.x, cameraRotation.y);

        // Player movement
        this.player.move(movement, this.cameraController, deltaTime, this.world);

        // Player jump
        if (this.input.isJumpPressed()) {
            this.player.jump();
        }

        this.player.update(deltaTime);

        // Player attack (not in build mode)
        if (this.input.isAttackPressed() && !this.buildingSystem.isInBuildMode) {
            const attackResults = this.combat.playerAttack(this.player, this.enemies);

            if (attackResults) {
                attackResults.forEach(result => {
                    const pos = result.position.clone();
                    pos.y += 2;
                    this.ui.showDamageNumber(
                        pos,
                        result.damage,
                        result.isCrit,
                        false,
                        this.camera,
                        this.renderer
                    );

                    // Check if killed
                    if (result.killed) {
                        this.onEnemyKilled(result.enemy);
                    }
                });
            }
        }

        // Resource harvesting
        if (this.input.isInteractPressed()) {
            // Check for harvestable resources
            const resource = this.biomeManager.getNearbyResource(this.player.position);
            if (resource) {
                const harvested = this.biomeManager.harvestResource(resource);
                if (harvested) {
                    this.player.addToInventory(harvested.type, harvested.amount);
                    this.updateResourceUI();
                }
            }

            // Check world interactables
            const interactable = this.world.getNearbyInteractable(this.player.position);
            if (interactable) {
                this.handleInteraction(interactable);
            }

            // Check creature interaction
            const creature = this.creatures.getNearbyCreature(this.player.position, 4);
            if (creature && !creature.isDead()) {
                creature.interact(this.player);
            }
        }

        // Update input state
        this.input.update();

        // Update camera
        this.cameraController.update(deltaTime);

        // Update biome effects
        this.biomeManager.updateBiomeEffects(this.player.position);
        this.updateBiomeUI();

        // Update building system
        this.buildingSystem.update(deltaTime);

        // Add building collidables to world temporarily
        // (would need proper integration)

        // Update enemies
        this.enemies.update(deltaTime, this.player, this.world);

        // Update creatures
        this.creatures.update(deltaTime, this.player, this.world);

        // Update companion
        this.companion.update(deltaTime, this.enemies, this.world);

        // Update loot
        const collected = this.lootSystem.update(deltaTime, this.player);
        collected.forEach(item => {
            // Add to inventory based on type
            if (this.player.inventory[item.type] !== undefined) {
                this.player.addToInventory(item.type, item.amount || 1);
            } else {
                this.player.addResource(item.type, item.amount || 1);
            }
            this.ui.showLootPickup(item);
            this.updateResourceUI();
        });

        // Update world and biome animations
        this.world.update(time);
        this.biomeManager.update(time, deltaTime);

        // Update UI
        this.ui.updatePlayerStats(this.player);
        this.ui.updateCompanionHealth(this.companion);
        this.ui.updateInventory(this.player);
        this.updateStaminaUI();

        // Check player death
        if (this.player.isDead()) {
            this.handlePlayerDeath();
        }
    }

    updateBiomeUI() {
        const biome = this.biomeManager.getBiomeAt(this.player.position.x, this.player.position.z);
        const indicator = document.getElementById('biome-indicator');
        const nameEl = document.getElementById('biome-name');

        if (biome.name !== this.currentBiomeName) {
            this.currentBiomeName = biome.name;
            if (nameEl) nameEl.textContent = biome.name;
            if (indicator) indicator.classList.add('visible');
            this.biomeChangeTimer = 3;
        }

        if (this.biomeChangeTimer > 0) {
            this.biomeChangeTimer -= 0.016;
            if (this.biomeChangeTimer <= 0 && indicator) {
                indicator.classList.remove('visible');
            }
        }
    }

    updateStaminaUI() {
        const staminaFill = document.getElementById('stamina-fill');
        const staminaText = document.getElementById('stamina-text');
        if (!staminaFill || !staminaText) return;

        const percent = this.player.getStaminaPercent() * 100;
        staminaFill.style.width = percent + '%';

        if (this.player.inWaterHazard) {
            staminaText.textContent = 'DANGER!';
            staminaFill.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
        } else {
            staminaText.textContent = 'Stamina';
            staminaFill.style.background = 'linear-gradient(90deg, #3b82f6, #60a5fa)';
        }
    }

    updateResourceUI() {
        const woodEl = document.getElementById('wood-count');
        const stoneEl = document.getElementById('stone-count');
        const oreEl = document.getElementById('ore-count');
        const crystalEl = document.getElementById('crystal-count');

        if (woodEl) woodEl.textContent = `🪵 ${this.player.inventory.wood}`;
        if (stoneEl) stoneEl.textContent = `🪨 ${this.player.inventory.stone}`;
        if (oreEl) oreEl.textContent = `⚙️ ${this.player.inventory.ore}`;
        if (crystalEl) crystalEl.textContent = `💎 ${this.player.inventory.crystal}`;
    }

    updateKillsUI() {
        const killsEl = document.getElementById('kills-text');
        if (killsEl) {
            killsEl.textContent = `Kills: ${this.totalKills}`;
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    handleInteraction(interactable) {
        switch (interactable.type) {
            case 'forge':
                if (this.player.resources.ore >= 3) {
                    this.showChoiceModal(true, false);
                }
                break;
            case 'shrine':
                if (this.player.resources.relicShards >= 2) {
                    this.showChoiceModal(false, true);
                }
                break;
        }
    }

    showChoiceModal(canForge, canRelic) {
        this.isPaused = true;

        this.ui.showChoiceModal(canForge, canRelic, (choice) => {
            if (choice === 'forge') {
                this.player.applyForgeUpgrade();
                this.progression.recordUpgrade('forge');
            } else if (choice === 'relic') {
                this.player.applyRelicUpgrade();
                this.progression.recordUpgrade('relic');
            }

            this.isPaused = false;
        });
    }

    handlePlayerDeath() {
        // Respawn in forest
        this.player.stats.health = this.player.stats.maxHealth;
        this.player.stats.stamina = this.player.stats.maxStamina;
        this.player.group.position.set(0, 0, -50);
        this.player.inWaterHazard = false;
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    stop() {
        this.isRunning = false;
    }
}

// Start game when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
