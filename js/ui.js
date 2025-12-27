/**
 * UI System - HUD updates, damage numbers, notifications
 */

class UISystem {
    constructor() {
        // Cache DOM elements
        this.elements = {
            healthFill: document.getElementById('health-fill'),
            healthText: document.getElementById('health-text'),
            xpFill: document.getElementById('xp-fill'),
            xpText: document.getElementById('xp-text'),
            attackStat: document.getElementById('attack-stat'),
            defenseStat: document.getElementById('defense-stat'),
            speedStat: document.getElementById('speed-stat'),
            killsText: document.getElementById('kills-text'),
            companionHealthFill: document.getElementById('companion-health-fill'),
            weaponSlot: document.getElementById('weapon-slot'),
            relicSlot: document.getElementById('relic-slot'),
            resourceSlot: document.getElementById('resource-slot'),
            choiceModal: document.getElementById('choice-modal'),
            levelUpPopup: document.getElementById('level-up-popup'),
            damageNumbers: document.getElementById('damage-numbers'),
            loadingScreen: document.getElementById('loading-screen'),
            loadingFill: document.getElementById('loading-fill')
        };

        this.lastLevel = 1;
    }

    // Update player stats display
    updatePlayerStats(player) {
        const healthPercent = (player.stats.health / player.stats.maxHealth) * 100;
        this.elements.healthFill.style.width = `${healthPercent}%`;
        this.elements.healthText.textContent = `${Math.ceil(player.stats.health)}/${player.stats.maxHealth}`;

        const xpPercent = (player.xp / player.xpToNextLevel) * 100;
        this.elements.xpFill.style.width = `${xpPercent}%`;
        this.elements.xpText.textContent = `LVL ${player.level}`;

        this.elements.attackStat.textContent = `⚔️ ${player.stats.attack + player.equipment.weapon.attackBonus}`;
        this.elements.defenseStat.textContent = `🛡️ ${player.stats.defense}`;
        this.elements.speedStat.textContent = `👟 ${player.stats.speed.toFixed(1)}`;

        this.elements.killsText.textContent = `Kills: ${player.kills}`;

        // Check for level up
        if (player.level > this.lastLevel) {
            this.showLevelUp();
            this.lastLevel = player.level;
        }
    }

    // Update companion health
    updateCompanionHealth(companion) {
        const percent = companion.getHealthPercent() * 100;
        this.elements.companionHealthFill.style.width = `${percent}%`;
    }

    // Update inventory display
    updateInventory(player) {
        // Weapon slot
        const weaponName = this.elements.weaponSlot.querySelector('.slot-name');
        weaponName.textContent = player.equipment.weapon.name.split(' ')[0];

        // Resource slots
        const relicCount = this.elements.relicSlot.querySelector('.slot-count');
        relicCount.textContent = player.resources.relicShards;

        const resourceCount = this.elements.resourceSlot.querySelector('.slot-count');
        resourceCount.textContent = player.resources.ore;
    }

    // Show damage number at screen position
    showDamageNumber(worldPos, damage, isCrit = false, isHeal = false, camera, renderer) {
        // Project world position to screen
        const screenPos = this.worldToScreen(worldPos, camera, renderer);
        if (!screenPos) return;

        const damageEl = document.createElement('div');
        damageEl.className = 'damage-number';
        if (isCrit) damageEl.classList.add('crit');
        if (isHeal) damageEl.classList.add('heal');

        damageEl.textContent = isHeal ? `+${damage}` : `-${damage}`;
        damageEl.style.left = `${screenPos.x}px`;
        damageEl.style.top = `${screenPos.y}px`;

        // Add random horizontal offset
        damageEl.style.transform = `translateX(${(Math.random() - 0.5) * 30}px)`;

        this.elements.damageNumbers.appendChild(damageEl);

        // Remove after animation
        setTimeout(() => {
            damageEl.remove();
        }, 1000);
    }

    // Show loot pickup notification
    showLootPickup(item) {
        const notif = document.createElement('div');
        notif.className = 'damage-number heal';
        notif.textContent = `${item.emoji} +${item.amount}`;
        notif.style.left = '50%';
        notif.style.top = '70%';
        notif.style.transform = 'translateX(-50%)';

        this.elements.damageNumbers.appendChild(notif);

        setTimeout(() => {
            notif.remove();
        }, 1000);
    }

    // Show level up popup
    showLevelUp() {
        this.elements.levelUpPopup.classList.remove('hidden');

        setTimeout(() => {
            this.elements.levelUpPopup.classList.add('hidden');
        }, 1500);
    }

    // Show choice modal
    showChoiceModal(canForge, canRelic, onChoice) {
        this.elements.choiceModal.classList.remove('hidden');

        const forgeBtn = document.getElementById('choice-forge');
        const relicBtn = document.getElementById('choice-relic');

        // Update button states
        forgeBtn.disabled = !canForge;
        forgeBtn.style.opacity = canForge ? 1 : 0.5;

        relicBtn.disabled = !canRelic;
        relicBtn.style.opacity = canRelic ? 1 : 0.5;

        // Setup click handlers
        const handleForge = () => {
            if (canForge) {
                onChoice('forge');
                this.hideChoiceModal();
                forgeBtn.removeEventListener('click', handleForge);
                relicBtn.removeEventListener('click', handleRelic);
            }
        };

        const handleRelic = () => {
            if (canRelic) {
                onChoice('relic');
                this.hideChoiceModal();
                forgeBtn.removeEventListener('click', handleForge);
                relicBtn.removeEventListener('click', handleRelic);
            }
        };

        forgeBtn.addEventListener('click', handleForge);
        relicBtn.addEventListener('click', handleRelic);
    }

    // Hide choice modal
    hideChoiceModal() {
        this.elements.choiceModal.classList.add('hidden');
    }

    // Hide loading screen
    hideLoadingScreen() {
        this.elements.loadingScreen.classList.add('hidden');
    }

    // Update loading progress
    updateLoadingProgress(percent) {
        this.elements.loadingFill.style.width = `${percent}%`;
    }

    // Convert world position to screen coordinates
    worldToScreen(worldPos, camera, renderer) {
        const vector = worldPos.clone();
        vector.project(camera);

        // Check if behind camera
        if (vector.z > 1) return null;

        const canvas = renderer.domElement;
        const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (-vector.y * 0.5 + 0.5) * canvas.clientHeight;

        return { x, y };
    }
}

// Export for use in other modules
window.UISystem = UISystem;
