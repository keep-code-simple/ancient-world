/**
 * Progression System - Handles leveling, stats, and upgrade tracking
 */

class ProgressionSystem {
    constructor(game) {
        this.game = game;

        // Milestones and achievements
        this.milestones = {
            firstKill: false,
            tenKills: false,
            firstLevelUp: false,
            firstUpgrade: false,
            campRaided: false
        };

        // Upgrade history
        this.upgradeHistory = [];
    }

    // Check for milestones
    checkMilestones(player) {
        const newMilestones = [];

        if (!this.milestones.firstKill && player.kills >= 1) {
            this.milestones.firstKill = true;
            newMilestones.push({ name: 'First Blood', description: 'Killed your first enemy!' });
        }

        if (!this.milestones.tenKills && player.kills >= 10) {
            this.milestones.tenKills = true;
            newMilestones.push({ name: 'Warrior', description: 'Killed 10 enemies!' });
        }

        if (!this.milestones.firstLevelUp && player.level >= 2) {
            this.milestones.firstLevelUp = true;
            newMilestones.push({ name: 'Growing Stronger', description: 'Reached level 2!' });
        }

        return newMilestones;
    }

    // Record upgrade choice
    recordUpgrade(type) {
        this.upgradeHistory.push({
            type,
            timestamp: Date.now()
        });

        if (!this.milestones.firstUpgrade) {
            this.milestones.firstUpgrade = true;
        }
    }

    // Get current power level (combined stat score)
    getPowerLevel(player) {
        return Math.floor(
            player.stats.attack * 2 +
            player.stats.defense * 1.5 +
            player.stats.maxHealth * 0.1 +
            player.level * 10
        );
    }

    // Calculate stat changes for display
    getStatDelta(player, upgradeType) {
        const current = { ...player.stats };
        let preview = {};

        if (upgradeType === 'forge') {
            preview = {
                attack: Math.floor(current.attack * 1.25) + 5,
                defense: current.defense,
                maxHealth: current.maxHealth,
                speed: current.speed
            };
        } else if (upgradeType === 'relic') {
            preview = {
                attack: Math.floor(current.attack * 1.2),
                defense: Math.floor(current.defense * 1.2),
                maxHealth: Math.floor(current.maxHealth * 1.2),
                speed: current.speed * 1.1
            };
        }

        return {
            current,
            preview,
            delta: {
                attack: preview.attack - current.attack,
                defense: preview.defense - current.defense,
                maxHealth: preview.maxHealth - current.maxHealth,
                speed: preview.speed - current.speed
            }
        };
    }
}

// Export for use in other modules
window.ProgressionSystem = ProgressionSystem;
