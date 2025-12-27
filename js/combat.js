/**
 * Combat System - Handles attacks, damage calculation, hit detection
 */

class CombatSystem {
    constructor(game) {
        this.game = game;
    }

    // Player attack - check for enemies in range
    playerAttack(player, enemies) {
        if (!player.attack()) return null; // Attack on cooldown

        const results = [];

        // Get player facing direction
        const facing = new THREE.Vector3(
            Math.sin(player.group.rotation.y),
            0,
            Math.cos(player.group.rotation.y)
        );

        // Check all enemies
        const nearbyEnemies = enemies.getEnemiesInRange(player.position, player.attackRange * 1.5);

        for (const enemy of nearbyEnemies) {
            // Check if enemy is in front of player (within cone)
            const toEnemy = new THREE.Vector3(
                enemy.position.x - player.position.x,
                0,
                enemy.position.z - player.position.z
            ).normalize();

            const dot = facing.dot(toEnemy);

            // ~90 degree cone in front
            if (dot > 0.3) {
                const { damage, isCrit } = player.calculateDamage();
                const killed = enemy.takeDamage(damage, isCrit);

                results.push({
                    enemy,
                    damage,
                    isCrit,
                    killed,
                    position: enemy.position.clone()
                });

                if (killed) {
                    this.onEnemyKilled(player, enemy);
                }
            }
        }

        return results;
    }

    // Handle enemy death
    onEnemyKilled(player, enemy) {
        // Award XP
        const xpGained = player.gainXP(enemy.xpValue);

        // Increment kill counter
        player.kills++;

        // Get loot drops
        const loot = enemy.getLoot();

        // Drop loot items in world
        loot.forEach(item => {
            this.game.lootSystem.spawnLoot(
                enemy.position.x + (Math.random() - 0.5) * 2,
                enemy.position.z + (Math.random() - 0.5) * 2,
                item.type,
                item.amount
            );
        });

        // Check for choice trigger
        this.checkChoiceTrigger(player);

        return { xp: xpGained, loot };
    }

    // Check if player can make a progression choice
    checkChoiceTrigger(player) {
        // Trigger choice modal every 5 kills (can upgrade path)
        const killMilestone = 5;

        if (player.kills > 0 && player.kills % killMilestone === 0) {
            // Check if player has resources for either upgrade
            const canForge = player.resources.ore >= 3;
            const canRelic = player.resources.relicShards >= 2;

            if (canForge || canRelic) {
                this.game.showChoiceModal(canForge, canRelic);
            }
        }
    }

    // Companion attack
    companionAttack(companion, enemies) {
        // Companion handles its own attack logic
        return null;
    }
}

// Export for use in other modules
window.CombatSystem = CombatSystem;
