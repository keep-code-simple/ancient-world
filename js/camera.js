/**
 * Third-Person Camera Controller
 * Follows player with smooth interpolation and orbit controls
 */

class ThirdPersonCamera {
    constructor(camera, target) {
        this.camera = camera;
        this.target = target; // Player mesh to follow

        // Camera positioning
        this.distance = 12;        // Distance from target
        this.minDistance = 5;
        this.maxDistance = 20;
        this.height = 6;           // Height above target
        this.heightOffset = 2;     // Look at offset above target center

        // Orbit angles
        this.azimuth = 0;          // Horizontal rotation (radians)
        this.elevation = 0.4;      // Vertical rotation (radians)
        this.minElevation = 0.1;
        this.maxElevation = 1.2;

        // Smoothing
        this.smoothSpeed = 8;
        this.rotationSensitivity = 0.003;

        // Current position (for interpolation)
        this.currentPosition = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();

        // Initialize position
        this.updateIdealPosition();
        this.currentPosition.copy(this.idealPosition);
        this.currentLookAt.copy(this.idealLookAt);
    }

    updateIdealPosition() {
        if (!this.target) return;

        // Calculate camera position based on orbit angles
        const x = Math.sin(this.azimuth) * Math.cos(this.elevation) * this.distance;
        const z = Math.cos(this.azimuth) * Math.cos(this.elevation) * this.distance;
        const y = Math.sin(this.elevation) * this.distance + this.height;

        this.idealPosition = new THREE.Vector3(
            this.target.position.x + x,
            this.target.position.y + y,
            this.target.position.z + z
        );

        this.idealLookAt = new THREE.Vector3(
            this.target.position.x,
            this.target.position.y + this.heightOffset,
            this.target.position.z
        );
    }

    // Handle mouse/touch rotation input
    rotate(deltaX, deltaY) {
        this.azimuth -= deltaX * this.rotationSensitivity;
        this.elevation += deltaY * this.rotationSensitivity;

        // Clamp elevation
        this.elevation = Math.max(this.minElevation, Math.min(this.maxElevation, this.elevation));
    }

    // Handle zoom input (mouse wheel)
    zoom(delta) {
        this.distance += delta * 0.01;
        this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
    }

    // Update camera each frame
    update(deltaTime) {
        if (!this.target) return;

        this.updateIdealPosition();

        // Smooth interpolation
        const t = 1 - Math.exp(-this.smoothSpeed * deltaTime);

        this.currentPosition.lerp(this.idealPosition, t);
        this.currentLookAt.lerp(this.idealLookAt, t);

        // Apply to camera
        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookAt);
    }

    // Get forward direction for player movement (ignores elevation)
    getForwardDirection() {
        return new THREE.Vector3(
            -Math.sin(this.azimuth),
            0,
            -Math.cos(this.azimuth)
        ).normalize();
    }

    // Get right direction for player movement
    getRightDirection() {
        return new THREE.Vector3(
            Math.cos(this.azimuth),
            0,
            -Math.sin(this.azimuth)
        ).normalize();
    }

    // Set new target to follow
    setTarget(target) {
        this.target = target;
    }
}

// Export for use in other modules
window.ThirdPersonCamera = ThirdPersonCamera;
