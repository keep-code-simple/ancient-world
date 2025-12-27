/**
 * Main Game Controller - Orchestrates all game systems
 * Ancient World - Medieval Adventure Game
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.isPaused = false;

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
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        this.scene.fog = new THREE.Fog(0x87ceeb, 30, 80);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            200
        );
    }

    initSystems() {
        // Input
        this.input = new InputHandler();

        // World
        this.world = new World(this.scene);

        // Player
        this.player = new Player(this.scene, { x: 0, z: 5 });

        // Camera controller
        this.cameraController = new ThirdPersonCamera(this.camera, this.player.mesh);

        // Companion
        this.companion = new Companion(this.scene, this.player);

        // Enemies
        this.enemies = new EnemyManager(this.scene);
        this.enemies.spawnInitial(this.world.getSpawnPoints());

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
        this.player.update(deltaTime);

        // Player attack
        if (this.input.isAttackPressed()) {
            const attackResults = this.combat.playerAttack(this.player, this.enemies);

            if (attackResults) {
                attackResults.forEach(result => {
                    // Show damage number
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
        }

        // Check interaction
        if (this.input.isInteractPressed()) {
            const interactable = this.world.getNearbyInteractable(this.player.position);
            if (interactable) {
                this.handleInteraction(interactable);
            }
        }

        // Update input state
        this.input.update();

        // Update camera
        this.cameraController.update(deltaTime);

        // Update enemies
        this.enemies.update(deltaTime, this.player, this.world);

        // Update companion
        this.companion.update(deltaTime, this.enemies, this.world);

        // Update loot
        const collected = this.lootSystem.update(deltaTime, this.player);
        collected.forEach(item => {
            this.ui.showLootPickup(item);
        });

        // Update world animations
        this.world.update(time);

        // Update UI
        this.ui.updatePlayerStats(this.player);
        this.ui.updateCompanionHealth(this.companion);
        this.ui.updateInventory(this.player);

        // Check progression milestones
        const milestones = this.progression.checkMilestones(this.player);
        // Could show milestone notifications here

        // Check player death
        if (this.player.isDead()) {
            this.handlePlayerDeath();
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
        // Simple respawn
        this.player.stats.health = this.player.stats.maxHealth;
        this.player.group.position.set(0, 0, 5);

        // Clear nearby enemies
        // Could add death penalty here
    }

    // Pause/resume
    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    // Stop game
    stop() {
        this.isRunning = false;
    }
}

// Start game when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
