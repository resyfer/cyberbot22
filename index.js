"use strict";
const OFFSET = 200;
const CAR_OFFSET = OFFSET / 4;
const TICK_RATE = 20;
const BULLET_DAMAGE = 10;
let SPAWN_STOP = false;
const NEON = [
    "rgba(21, 244, 238, 100)",
    "rgba(255, 255, 51, 100)",
    "rgba(0, 255, 102, 100)",
    "rgba(255, 0, 255, 100)",
    "rgba(157, 0, 255, 100)",
    "rgba(113, 34, 250, 100)",
    "rgba(165, 216, 243, 100)",
    "rgba(19, 202, 145, 100)",
    "rgba(248, 81, 37, 100)",
    "rgba(235, 248, 117, 100)",
    "rgba(217, 235, 75, 100)",
    "rgba(242, 26, 29, 100)",
    "rgba(127, 255, 0, 100)",
    "rgba(255, 32, 121, 100)",
];
const BEST_SCORE = parseInt(localStorage.getItem("best") ?? "0");
let newBestScore = false;
const startDiv = document.getElementById("start");
const supermanDiv = document.getElementById("superman");
const ammoDiv = document.getElementById("ammo");
const bulletContainer = document.getElementById("bullets");
const obstacleContainer = document.getElementById("obstacles");
const scoreContainer = document.getElementById("score");
const bestScoreContainer = document.getElementById("best");
bestScoreContainer.innerText = `Best: ${BEST_SCORE}`;
const gameOverScreen = document.getElementById("game-over");
const gameOverScore = document.getElementById("game-over-current-score");
const gameOverMessage = document.getElementById("game-over-message");
const gameOverBest = document.getElementById("game-over-best-score");
const hpContainer = document.getElementById("hp");
const pewSFX = new Audio("./assets/pew.mp3");
const damageSFX = new Audio("./assets/damage.mp3");
class Utils {
    static getRandomNum(high, low = 0, multiplier = 1) {
        const diff = Math.abs(high - low) / multiplier;
        return Math.floor(Math.random() * diff) * multiplier + Math.abs(low);
    }
    static randomSpawn(callback) {
        const time = Math.round(Utils.getRandomNum(175, 50) * TICK_RATE);
        setTimeout(() => {
            callback();
            if (!SPAWN_STOP) {
                Utils.randomSpawn(callback);
            }
        }, time);
    }
    static getBoundingRectangle(item) {
        return {
            left: item.position.x - Math.round(item.size.width / 2),
            top: item.position.y - Math.round(item.size.height / 2),
            right: item.position.x + Math.round(item.size.width / 2),
            bottom: item.position.y + Math.round(item.size.height / 2),
        };
    }
    static checkCollision(item1, item2) {
        const rect1 = Utils.getBoundingRectangle(item1);
        const rect2 = Utils.getBoundingRectangle(item2);
        if (rect1.top > rect2.bottom || rect1.bottom < rect2.top) {
            return false;
        }
        else if (rect1.right < rect2.left || rect1.left > rect2.right) {
            return false;
        }
        else {
            return true;
        }
    }
    static setPos(element, item) {
        const rect = Utils.getBoundingRectangle(item);
        element.style.top = `${rect.top}px`;
        element.style.left = `${rect.left}px`;
    }
    static setSize(element, item, multiplier = 1) {
        element.style.height = `${item.size.height * multiplier}px`;
        element.style.width = `${item.size.width * multiplier}px`;
    }
    static keyboardPress(superman, event) {
        if (event.key === "ArrowDown" || event.key === "s") {
            superman.change("DOWN");
        }
        else if (event.key === "ArrowUp" || event.key === "w") {
            superman.change("UP");
        }
    }
    static click(superman) {
        if (Superman.magazine === 0) {
            return;
        }
        const bullet = new Bullet(superman.position.x + 3 * (superman.size.width / 8), superman.position.y + superman.size.height / 4, Superman.bullets.list.length);
        Superman.bullets.list.push(bullet);
        Superman.useAmmo();
    }
    static stopAudio(element) {
        element.pause();
        element.currentTime = 0;
    }
    static restartAudio(element) {
        if (SPAWN_STOP) {
            return;
        }
        Utils.stopAudio(element);
        element.play();
    }
}
class Game {
    static score = 0;
    static obstacles = {
        list: [],
        count: 0,
    };
    static start() {
        startDiv.remove();
        const superman = new Superman();
        supermanDiv.style.display = "block";
        const leftWall = new Item(0, window.innerHeight / 2, window.innerHeight, 0);
        Utils.randomSpawn(Game.spawnObstacles);
        const checkInterval = setInterval(() => {
            Game.obstacles.list.forEach((obstacle) => {
                if (obstacle === null) {
                    return;
                }
                if (Utils.checkCollision(superman, obstacle) ||
                    Utils.checkCollision(leftWall, obstacle)) {
                    superman.damage();
                    obstacle.destroy();
                    Superman.resetAmmo();
                    if (superman.lives === 0) {
                        clearInterval(checkInterval);
                        Game.over(superman);
                        return;
                    }
                }
                Superman.bullets.list.forEach((bullet) => {
                    if (bullet === null) {
                        return;
                    }
                    if (Utils.checkCollision(obstacle, bullet)) {
                        bullet.destroy();
                        obstacle.hit();
                    }
                });
            });
        }, TICK_RATE / 5);
    }
    static incrementScore(amount = 10) {
        Game.score += amount;
        scoreContainer.innerText = `Score: ${Game.score.toString()}`;
    }
    static resetScore() {
        Game.score = 0;
    }
    static spawnObstacles() {
        const obstacle = new Obstacle(Game.obstacles.list.length);
        Game.obstacles.count++;
        Game.obstacles.list.push(obstacle);
    }
    static over(superman) {
        SPAWN_STOP = true;
        if (BEST_SCORE < Game.score) {
            localStorage.setItem("best", Game.score.toString());
            newBestScore = true;
        }
        obstacleContainer.remove();
        bulletContainer.remove();
        scoreContainer.remove();
        hpContainer.remove();
        gameOverScore.innerText = `Score: ${Game.score.toString()}`;
        gameOverMessage.innerText = newBestScore
            ? "Yay! New high score!!"
            : "We're here to smash records, not your PC";
        gameOverBest.innerText = `Best Score: ${newBestScore ? Game.score : BEST_SCORE}`;
        gameOverScreen.style.display = "flex";
        superman.destroy();
    }
}
class Item {
    position;
    size;
    constructor(x, y, height, width) {
        this.position = {
            x,
            y,
        };
        this.size = {
            height,
            width,
        };
    }
}
class Superman extends Item {
    static bullets = {
        list: [],
        count: 0,
    };
    static ammo;
    move = 10;
    lives;
    constructor() {
        super(100, window.innerHeight / 2, 75, 175);
        Superman.ammo = 51;
        this.lives = 5;
        Utils.setPos(supermanDiv, this);
        Utils.setSize(supermanDiv, this);
        window.addEventListener("keydown", (e) => Utils.keyboardPress(this, e));
        window.addEventListener("click", (e) => Utils.click(this));
    }
    get location() {
        return this.position;
    }
    static get magazine() {
        return Superman.ammo;
    }
    static resetAmmo() {
        Superman.ammo = 50;
        Superman.bullets.count = 0;
        Superman.bullets.list = [];
        ammoDiv.innerText = `Ammo: ${Superman.ammo}`;
    }
    static useAmmo() {
        Superman.ammo--;
        ammoDiv.innerText = `Ammo: ${Superman.ammo}`;
    }
    static incrementAmmo() {
        Superman.ammo++;
        ammoDiv.innerText = `Ammo: ${Superman.ammo}`;
    }
    change(dir) {
        if (dir === "UP") {
            if (this.position.y - this.size.height / 2 - this.move > CAR_OFFSET) {
                this.position.y -= this.move;
            }
        }
        else {
            if (this.position.y + this.size.height / 2 + this.move <
                window.innerHeight - CAR_OFFSET) {
                this.position.y += this.move;
            }
        }
        Utils.setPos(supermanDiv, this);
    }
    damage() {
        this.lives--;
        hpContainer.innerText = `Lives: ${this.lives.toString()}`;
        Utils.restartAudio(damageSFX);
    }
    destroy() {
        supermanDiv.remove();
    }
}
class Bullet extends Item {
    velocity = 5;
    index;
    update;
    div;
    constructor(x, y, index) {
        super(x, y, 5, 10);
        const this_bullet = this;
        this.div = document.createElement("div");
        this.div.classList.add("bullet");
        Utils.setSize(this.div, this);
        bulletContainer.appendChild(this.div);
        Utils.setPos(this.div, this_bullet);
        this.update = setInterval(() => {
            this.position.x += this.velocity;
            Utils.setPos(this.div, this_bullet);
            if (this.position.x > window.innerWidth + 300) {
                this.destroy();
            }
        }, TICK_RATE);
        this.index = index;
        Utils.restartAudio(pewSFX);
    }
    destroy() {
        bulletContainer.removeChild(this.div);
        clearInterval(this.update);
        Superman.bullets.list[this.index] = null;
        Superman.bullets.count--;
    }
}
class Obstacle extends Item {
    index;
    velocity = 0.5;
    update;
    health;
    color;
    div;
    constructor(index) {
        const health = Utils.getRandomNum(40, 20, 10);
        const size = health * 2;
        super(window.innerWidth, Utils.getRandomNum(window.innerHeight - OFFSET - size / 2, OFFSET + size / 2), size, size);
        this.index = index;
        this.health = {
            original: health,
            remaining: health,
        };
        this.size = {
            width: size,
            height: size,
        };
        this.div = document.createElement("div");
        this.div.classList.add("obstacle");
        this.color = NEON[Utils.getRandomNum(NEON.length - 1)];
        this.div.style.backgroundColor = this.color;
        this.div.style.boxShadow = `0 0 1.75vh 0.1vh ${this.color}`;
        Utils.setSize(this.div, this);
        obstacleContainer.appendChild(this.div);
        Utils.setPos(this.div, this);
        this.update = setInterval(() => {
            this.position.x -= this.velocity;
            Utils.setPos(this.div, this);
            if (Utils.getBoundingRectangle(this).right < 0) {
                this.destroy();
            }
        });
    }
    get location() {
        return this.position;
    }
    hit() {
        Game.incrementScore(BULLET_DAMAGE);
        Superman.incrementAmmo();
        this.health.remaining -= BULLET_DAMAGE;
        this.size.height = this.size.width = this.health.remaining * 2;
        Utils.setSize(this.div, this);
        Utils.setPos(this.div, this);
        if (this.health.remaining === 0) {
            this.destroy();
        }
    }
    get life() {
        return this.health;
    }
    destroy() {
        clearInterval(this.update);
        Game.obstacles.list[this.index] = null;
        Game.obstacles.count--;
        obstacleContainer.removeChild(this.div);
    }
}
