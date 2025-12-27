/**
 * Main Game Controller - Orchestrates all game systems
 * Ancient World - Medieval Adventure Game (Iteration 2)
 * Features: Biomes, Jumping, Swimming, Magical Creatures
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

        // Initialize Three.js
        this.initRenderer();
        this.initScene();

        // Initialize game systems
        this.initSystems();

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

        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, 40, 100);

        // Camera with increased far plane for larger world
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            300
        );
    }

    initSystems() {
        // Input
        this.input = new InputHandler();

        // Biome Manager (must be created before world)
        this.biomeManager = new BiomeManager(this.scene);

        // World (now uses biome manager)
        this.world = new World(this.scene, this.biomeManager);

        // Create biome terrain and water
        this.biomeManager.createTerrain();
        this.biomeManager.createWaterBodies();

        // Create environment for each biome
        this.biomeManager.createBiomeEnvironment('forest', this.world.collidables);
        this.biomeManager.createBiomeEnvironment('swamp', this.world.collidables);
        this.biomeManager.createBiomeEnvironment('magic', this.world.collidables);

        // Player (spawn in forest biome)
        this.player = new Player(this.scene, { x: 0, z: -20 });
        this.player.setBiomeManager(this.biomeManager);

        // Camera controller
        this.cameraController = new ThirdPersonCamera(this.camera, this.player.mesh);

        // Companion
        this.companion = new Companion(this.scene, this.player);

        // Enemies (biome-aware)
        this.enemies = new EnemyManager(this.scene);
        this.enemies.setBiomeManager(this.biomeManager);
        this.spawnBiomeEnemies();

        // Magical Creatures
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

    spawnBiomeEnemies() {
        // Forest enemies
        const forestPoints = this.biomeManager.getSpawnPointsForBiome('forest');
        forestPoints.forEach((p, i) => {
            const types = ['goblin', 'orc', 'skeleton'];
            this.enemies.spawn(p.x, p.z, types[i % types.length]);
        });

        // Swamp enemies
        const swampPoints = this.biomeManager.getSpawnPointsForBiome('swamp');
        swampPoints.forEach((p, i) => {
            const types = ['bog_lurker', 'poison_frog'];
            this.enemies.spawn(p.x, p.z, types[i % types.length]);
        });

        // Magic enemies
        const magicPoints = this.biomeManager.getSpawnPointsForBiome('magic');
        magicPoints.forEach((p, i) => {
            const types = ['wisp', 'corrupted_golem'];
            this.enemies.spawn(p.x, p.z, types[i % types.length]);
        });
    }

    start() {
        this.isRunning = true;

        // Hide loading screen after brief delay
        setTimeout(() => {
            this.ui.hideLoadingScreen();
        }, 2000);

        // Start game loop
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
        // Handle input
        const movement = this.input.getMovement();
        const cameraRotation = this.input.getCameraRotation();

        // Camera rotation
        this.cameraController.rotate(cameraRotation.x, cameraRotation.y);

        // Player movement
        this.player.move(movement, this.cameraController, deltaTime, this.world);

        // Player jump
        if (this.input.isJumpPressed()) {
            this.player.jump();
        }

        // Player update (includes jump physics and swimming)
        this.player.update(deltaTime);

        // Player attack (mouse click)
        if (this.input.isAttackPressed()) {
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
                });
            }

            // Also attack nearby creatures
            const nearbyCreature = this.creatures.getNearbyCreature(this.player.position, this.player.attackRange);
            if (nearbyCreature && !nearbyCreature.isDead()) {
                const { damage } = this.player.calculateDamage();
                nearbyCreature.takeDamage(damage);
            }
        }

        // Check interaction
        if (this.input.isInteractPressed()) {
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

        // Update biome effects based on player position
        this.biomeManager.updateBiomeEffects(this.player.position);
        this.updateBiomeUI();

        // Update enemies
        this.enemies.update(deltaTime, this.player, this.world);

        // Update creatures
        this.creatures.update(deltaTime, this.player, this.world);

        // Update companion
        this.companion.update(deltaTime, this.enemies, this.world);

        // Update loot
        const collected = this.lootSystem.update(deltaTime, this.player);
        collected.forEach(item => {
            this.ui.showLootPickup(item);
        });

        // Update world and biome animations
        this.world.update(time);
        this.biomeManager.update(time);

        // Update UI
        this.ui.updatePlayerStats(this.player);
        this.ui.updateCompanionHealth(this.companion);
        this.ui.updateInventory(this.player);
        this.updateStaminaUI();

        // Check progression milestones
        this.progression.checkMilestones(this.player);

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
            nameEl.textContent = biome.name;
            indicator.classList.add('visible');
            this.biomeChangeTimer = 3; // Show for 3 seconds
        }

        if (this.biomeChangeTimer > 0) {
            this.biomeChangeTimer -= 0.016; // ~60fps
            if (this.biomeChangeTimer <= 0) {
                indicator.classList.remove('visible');
            }
        }
    }

    updateStaminaUI() {
        const staminaFill = document.getElementById('stamina-fill');
        const staminaText = document.getElementById('stamina-text');
        const percent = this.player.getStaminaPercent() * 100;

        staminaFill.style.width = percent + '%';

        if (this.player.isSwimming) {
            staminaText.textContent = 'Swimming';
            staminaFill.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
        } else {
            staminaText.textContent = 'Stamina';
            staminaFill.style.background = 'linear-gradient(90deg, #3b82f6, #60a5fa)';
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
        this.player.group.position.set(0, 0, -20);
        this.player.isSwimming = false;
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
