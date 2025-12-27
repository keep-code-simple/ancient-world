/**
 * Input Handler - Unified keyboard, mouse, and touch input
 * Supports desktop (WASD + mouse) and mobile (virtual joystick + tap)
 */

class InputHandler {
    constructor() {
        // Movement state
        this.movement = { x: 0, z: 0 };
        
        // Mouse/camera state
        this.mouse = { x: 0, y: 0, deltaX: 0, deltaY: 0 };
        this.isPointerLocked = false;
        
        // Action states
        this.actions = {
            attack: false,
            interact: false,
            attackPressed: false,
            interactPressed: false
        };
        
        // Key states
        this.keys = {};
        
        // Touch state
        this.touch = {
            active: false,
            joystickOrigin: { x: 0, y: 0 },
            joystickCurrent: { x: 0, y: 0 },
            cameraTouch: null
        };
        
        // Device detection
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        this.init();
    }
    
    init() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Mouse events
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        document.addEventListener('click', (e) => this.onClick(e));
        
        // Pointer lock
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        
        // Touch events
        if (this.isMobile) {
            this.initTouchControls();
        }
        
        // Prevent context menu
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    initTouchControls() {
        const joystickBase = document.getElementById('joystick-base');
        const joystickStick = document.getElementById('joystick-stick');
        const attackBtn = document.getElementById('attack-btn');
        const interactBtn = document.getElementById('interact-btn');
        const canvas = document.getElementById('game-canvas');
        
        // Joystick touch handling
        joystickBase.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = joystickBase.getBoundingClientRect();
            this.touch.active = true;
            this.touch.joystickOrigin = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
            this.updateJoystick(touch.clientX, touch.clientY, joystickStick);
        });
        
        joystickBase.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.touch.active) {
                const touch = e.touches[0];
                this.updateJoystick(touch.clientX, touch.clientY, joystickStick);
            }
        });
        
        joystickBase.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touch.active = false;
            this.movement = { x: 0, z: 0 };
            joystickStick.style.transform = 'translate(0, 0)';
        });
        
        // Action buttons
        attackBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.actions.attackPressed = true;
            this.actions.attack = true;
        });
        
        attackBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.actions.attack = false;
        });
        
        interactBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.actions.interactPressed = true;
            this.actions.interact = true;
        });
        
        interactBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.actions.interact = false;
        });
        
        // Camera rotation on canvas touch
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.touch.cameraTouch = {
                    id: e.touches[0].identifier,
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
            }
        });
        
        canvas.addEventListener('touchmove', (e) => {
            if (this.touch.cameraTouch) {
                for (let touch of e.touches) {
                    if (touch.identifier === this.touch.cameraTouch.id) {
                        this.mouse.deltaX = (touch.clientX - this.touch.cameraTouch.x) * 0.5;
                        this.mouse.deltaY = (touch.clientY - this.touch.cameraTouch.y) * 0.5;
                        this.touch.cameraTouch.x = touch.clientX;
                        this.touch.cameraTouch.y = touch.clientY;
                        break;
                    }
                }
            }
        });
        
        canvas.addEventListener('touchend', (e) => {
            this.touch.cameraTouch = null;
            this.mouse.deltaX = 0;
            this.mouse.deltaY = 0;
        });
    }
    
    updateJoystick(touchX, touchY, stick) {
        const dx = touchX - this.touch.joystickOrigin.x;
        const dy = touchY - this.touch.joystickOrigin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 35;
        
        const clampedDistance = Math.min(distance, maxDistance);
        const angle = Math.atan2(dy, dx);
        
        const moveX = Math.cos(angle) * clampedDistance;
        const moveY = Math.sin(angle) * clampedDistance;
        
        stick.style.transform = `translate(${moveX}px, ${moveY}px)`;
        
        // Normalize to -1 to 1
        this.movement.x = clampedDistance > 5 ? (moveX / maxDistance) : 0;
        this.movement.z = clampedDistance > 5 ? (moveY / maxDistance) : 0;
    }
    
    onKeyDown(e) {
        this.keys[e.code] = true;
        this.updateMovementFromKeys();
        
        if (e.code === 'Space') {
            this.actions.attackPressed = true;
            this.actions.attack = true;
        }
        
        if (e.code === 'KeyE') {
            this.actions.interactPressed = true;
            this.actions.interact = true;
        }
    }
    
    onKeyUp(e) {
        this.keys[e.code] = false;
        this.updateMovementFromKeys();
        
        if (e.code === 'Space') {
            this.actions.attack = false;
        }
        
        if (e.code === 'KeyE') {
            this.actions.interact = false;
        }
    }
    
    updateMovementFromKeys() {
        this.movement.x = 0;
        this.movement.z = 0;
        
        if (this.keys['KeyW'] || this.keys['ArrowUp']) this.movement.z = -1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) this.movement.z = 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.movement.x = -1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.movement.x = 1;
        
        // Normalize diagonal movement
        if (this.movement.x !== 0 && this.movement.z !== 0) {
            const len = Math.sqrt(this.movement.x ** 2 + this.movement.z ** 2);
            this.movement.x /= len;
            this.movement.z /= len;
        }
    }
    
    onMouseMove(e) {
        if (this.isPointerLocked) {
            this.mouse.deltaX = e.movementX;
            this.mouse.deltaY = e.movementY;
        } else {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        }
    }
    
    onMouseDown(e) {
        if (e.button === 0) { // Left click
            this.actions.attackPressed = true;
            this.actions.attack = true;
        }
    }
    
    onMouseUp(e) {
        if (e.button === 0) {
            this.actions.attack = false;
        }
    }
    
    onClick(e) {
        // Request pointer lock on canvas click
        const canvas = document.getElementById('game-canvas');
        if (e.target === canvas && !this.isPointerLocked && !this.isMobile) {
            canvas.requestPointerLock();
        }
    }
    
    onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === document.getElementById('game-canvas');
    }
    
    // Call once per frame to reset single-press actions
    update() {
        this.actions.attackPressed = false;
        this.actions.interactPressed = false;
        
        // Reset mouse delta after processing
        if (!this.isMobile) {
            this.mouse.deltaX = 0;
            this.mouse.deltaY = 0;
        }
    }
    
    // Get movement direction (normalized)
    getMovement() {
        return { ...this.movement };
    }
    
    // Get camera rotation delta
    getCameraRotation() {
        return {
            x: this.mouse.deltaX,
            y: this.mouse.deltaY
        };
    }
    
    // Check if attack was just pressed this frame
    isAttackPressed() {
        return this.actions.attackPressed;
    }
    
    // Check if interact was just pressed this frame
    isInteractPressed() {
        return this.actions.interactPressed;
    }
    
    // Check if attack is held
    isAttacking() {
        return this.actions.attack;
    }
}

// Export for use in other modules
window.InputHandler = InputHandler;
