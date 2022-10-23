//--------CONSTANTS---------------
const OFFSET = 200;
const CAR_OFFSET = OFFSET / 4;
const TICK_RATE = 20; // 20 ms => 50 tick server
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

//--------DIV---------------
const startDiv = document.getElementById("start") as HTMLDivElement;
const supermanDiv = document.getElementById("superman") as HTMLDivElement;
const ammoDiv = document.getElementById("ammo") as HTMLDivElement;
const bulletContainer = document.getElementById("bullets") as HTMLDivElement;
const obstacleContainer = document.getElementById(
  "obstacles"
) as HTMLDivElement;
const scoreContainer = document.getElementById("score") as HTMLDivElement;

const bestScoreContainer = document.getElementById("best") as HTMLDivElement;
bestScoreContainer.innerText = `Best: ${BEST_SCORE}`;

const gameOverScreen = document.getElementById("game-over") as HTMLDivElement;
const gameOverScore = document.getElementById(
  "game-over-current-score"
) as HTMLDivElement;
const gameOverMessage = document.getElementById(
  "game-over-message"
) as HTMLDivElement;
const gameOverBest = document.getElementById(
  "game-over-best-score"
) as HTMLDivElement;
const hpContainer = document.getElementById("hp") as HTMLDivElement;

//--------AUDIO---------------
const pewSFX = new Audio("./assets/pew.mp3");
const damageSFX = new Audio("./assets/damage.mp3");

//--------TYPES---------------
interface Rectangle {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

//--------UTILITY FUNCTIONS---------------
class Utils {
  // Get a random number between specified limits, and will increment in `multiplier` steps
  static getRandomNum(high: number, low = 0, multiplier = 1) {
    const diff = Math.abs(high - low) / multiplier;
    return Math.floor(Math.random() * diff) * multiplier + Math.abs(low);
  }

  // Spawn Obstacles randomly
  static randomSpawn(callback: (...args: string[]) => void) {
    const time = Math.round(Utils.getRandomNum(175, 50) * TICK_RATE);

    //! Will not cause stack overflow because of the way setTimeout works
    setTimeout(() => {
      callback();
      if (!SPAWN_STOP) {
        Utils.randomSpawn(callback);
      }
    }, time);
  }

  // Get outer bounding rectangle of items
  static getBoundingRectangle(item: Item): Rectangle {
    return {
      left: item.position.x - Math.round(item.size.width / 2),
      top: item.position.y - Math.round(item.size.height / 2),
      right: item.position.x + Math.round(item.size.width / 2),
      bottom: item.position.y + Math.round(item.size.height / 2),
    };
  }

  // Check collision between item1 & item2
  static checkCollision(item1: Item, item2: Item) {
    const rect1: Rectangle = Utils.getBoundingRectangle(item1);
    const rect2: Rectangle = Utils.getBoundingRectangle(item2);

    if (rect1.top > rect2.bottom || rect1.bottom < rect2.top) {
      return false;
    } else if (rect1.right < rect2.left || rect1.left > rect2.right) {
      return false;
    } else {
      return true;
    }
  }

  // Set the position of item on DOM
  static setPos(element: HTMLDivElement, item: Item) {
    const rect = Utils.getBoundingRectangle(item);
    element.style.top = `${rect.top}px`;
    element.style.left = `${rect.left}px`;
  }

  // Set the size of item (mostly obstacle)
  static setSize(element: HTMLDivElement, item: Item, multiplier = 1) {
    element.style.height = `${item.size.height * multiplier}px`;
    element.style.width = `${item.size.width * multiplier}px`;
  }

  // Track key presses
  static keyboardPress(superman: Superman, event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "s") {
      superman.change("DOWN");
    } else if (event.key === "ArrowUp" || event.key === "w") {
      superman.change("UP");
    }
  }

  // Pew pew
  static click(superman: Superman) {
    if (Superman.magazine === 0) {
      return;
    }

    const bullet = new Bullet(
      superman.position.x + 3 * (superman.size.width / 8),
      superman.position.y + superman.size.height / 4,
      Superman.bullets.list.length
    );

    Superman.bullets.list.push(bullet);
    Superman.useAmmo();
  }

  // Jugaad to stop the play and go back to start
  static stopAudio(element: HTMLAudioElement) {
    element.pause();
    element.currentTime = 0;
  }

  // Restarts audio to enable stoping the previous play in between and replay.
  static restartAudio(element: HTMLAudioElement) {
    if (SPAWN_STOP) {
      return;
    }

    Utils.stopAudio(element);
    element.play();
  }
}

//--------GAME STATE AND METHODS---------------
class Game {
  public static score = 0;
  public static obstacles: {
    list: (Obstacle | null)[];
    count: number;
  } = {
    list: [],
    count: 0,
  };

  // It all starts with this
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

        if (
          Utils.checkCollision(superman, obstacle) ||
          Utils.checkCollision(leftWall, obstacle)
        ) {
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

  // Score Methods
  static incrementScore(amount = 10) {
    Game.score += amount;
    scoreContainer.innerText = `Score: ${Game.score.toString()}`;
  }

  static resetScore() {
    Game.score = 0;
  }

  // Spawn an obstacle
  static spawnObstacles() {
    const obstacle = new Obstacle(Game.obstacles.list.length);
    Game.obstacles.count++;
    Game.obstacles.list.push(obstacle);
  }

  // Game over. Ta ta bye bye
  static over(superman: Superman) {
    SPAWN_STOP = true;

    // Set best score
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

    gameOverBest.innerText = `Best Score: ${
      newBestScore ? Game.score : BEST_SCORE
    }`;
    gameOverScreen.style.display = "flex";
    superman.destroy();
  }
}

class Item {
  public position: {
    x: number;
    y: number;
  };

  public size: {
    height: number;
    width: number;
  };

  constructor(x: number, y: number, height: number, width: number) {
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
  public static bullets: {
    list: (Bullet | null)[];
    count: number;
  } = {
    list: [],
    count: 0,
  };

  private static ammo: number;

  private move = 10;
  public lives;

  constructor() {
    super(100, window.innerHeight / 2, 75, 175);
    Superman.ammo = 51; // 1 extra for the initial demo
    this.lives = 5;

    Utils.setPos(supermanDiv, this);
    Utils.setSize(supermanDiv, this);

    // Track mouse and keyboard for movement or shoot
    window.addEventListener("keydown", (e) => Utils.keyboardPress(this, e));
    window.addEventListener("click", (e) => Utils.click(this));
  }

  get location() {
    return this.position;
  }

  // Ammo
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

  // Update position based on the direction of movement and velocity of moving
  change(dir: "UP" | "DOWN") {
    if (dir === "UP") {
      if (this.position.y - this.size.height / 2 - this.move > CAR_OFFSET) {
        this.position.y -= this.move;
      }
    } else {
      if (
        this.position.y + this.size.height / 2 + this.move <
        window.innerHeight - CAR_OFFSET
      ) {
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

  // Wannabe destructor since this is a garbage collected lang :)
  destroy() {
    supermanDiv.remove();
  }
}

class Bullet extends Item {
  private velocity = 5;
  public index: number;
  private update: number;
  private div: HTMLDivElement;

  constructor(x: number, y: number, index: number) {
    super(x, y, 5, 10);

    // Create the bullet in DOM
    const this_bullet = this;
    this.div = document.createElement("div");
    this.div.classList.add("bullet");
    Utils.setSize(this.div, this);
    bulletContainer.appendChild(this.div);

    Utils.setPos(this.div, this_bullet);

    // Position update per TICK of server and velocity of bullet
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
  public index: number;
  private velocity: number = 0.5;
  private update: number;
  private health: {
    original: number; // 10-40
    remaining: number;
  };
  public color: string;

  private div: HTMLDivElement;

  constructor(index: number) {
    const health = Utils.getRandomNum(40, 20, 10);
    const size = health * 2;

    super(
      window.innerWidth,
      // Set spawn height to random, but within aukat
      Utils.getRandomNum(
        window.innerHeight - OFFSET - size / 2,
        OFFSET + size / 2
      ),
      size,
      size
    );
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

    //? Taking UFOs as obstacles makes no sense because it becomes smaller when hit
    // const ufo = document.createElement("img");
    // ufo.setAttribute("src", "./assets/ufo.png");
    // this.div.appendChild(ufo);

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
    // Increase Score
    Game.incrementScore(BULLET_DAMAGE);

    // Restore bullet
    Superman.incrementAmmo();

    // Update Health
    this.health.remaining -= BULLET_DAMAGE;

    // Update Size
    this.size.height = this.size.width = this.health.remaining * 2;
    Utils.setSize(this.div, this);

    // Update position if necessary
    // (if not done, it may cause a skip in updating positions
    // when TICK and hit coincide)
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
