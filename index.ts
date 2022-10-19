const OFFSET = window.innerHeight / 20;
const TICK_RATE = 20; // 20 ms => 50 tick server
const BULLET_DAMAGE = 10;

let SPAWN_STOP = false;

const supermanDiv = document.getElementById("superman") as HTMLDivElement;
const bulletContainer = document.getElementById("bullets") as HTMLDivElement;
const obstacleContainer = document.getElementById(
  "obstacles"
) as HTMLDivElement;
const scoreContainer = document.getElementById("score") as HTMLDivElement;

interface Rectangle {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

class Utils {
  static getRandomNum(high: number, low = 0, multiplier = 1) {
    const diff = Math.abs(high - low) / multiplier;
    return Math.floor(Math.random() * diff) * multiplier + Math.abs(low);
  }

  static randomSpawn(callback: (...args: string[]) => void) {
    const time = Math.round(Utils.getRandomNum(125, 50) * TICK_RATE);
    setTimeout(() => {
      callback();
      if (!SPAWN_STOP) {
        Utils.randomSpawn(callback);
      }
    }, time);
  }

  static getBoundingRectangle(item: Item): Rectangle {
    return {
      left: item.position.x - Math.round(item.size.width / 2),
      top: item.position.y - Math.round(item.size.height / 2),
      right: item.position.x + Math.round(item.size.width / 2),
      bottom: item.position.y + Math.round(item.size.height / 2),
    };
  }

  static checkCollision(item1: Item, item2: Item) {
    const rect1: Rectangle = Utils.getBoundingRectangle(item1);
    const rect2: Rectangle = Utils.getBoundingRectangle(item2);

    if (
      (rect1.left < rect2.left && rect1.right < rect2.right) ||
      (rect1.left > rect2.left && rect1.right > rect2.right)
    ) {
      return false;
    } else if (
      (rect1.top < rect2.top && rect1.bottom < rect2.bottom) ||
      (rect1.top > rect2.top && rect1.bottom > rect2.bottom)
    ) {
      return false;
    } else {
      return true;
    }
  }

  static setPos(element: HTMLDivElement, item: Item) {
    const rect = Utils.getBoundingRectangle(item);
    element.style.top = `${rect.top}px`;
    element.style.left = `${rect.left}px`;
  }

  static setSize(element: HTMLDivElement, item: Item) {
    element.style.height = `${item.size.height}px`;
    element.style.width = `${item.size.width}px`;
  }
}

class Game {
  private static score = 0;
  public static obstacles: {
    list: (Obstacle | null)[];
    count: number;
  } = {
    list: [],
    count: 0,
  };

  static incr(amount = 10) {
    scoreContainer.innerText = Game.score.toString();
    Game.score += amount;
  }

  static reset() {
    Game.score = 0;
  }

  static spawnObstacles() {
    const obstacle = new Obstacle(Game.obstacles.list.length);
    Game.obstacles.count++;
    Game.obstacles.list.push(obstacle);
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

  private move = 5;

  constructor() {
    super(OFFSET * 4, window.innerHeight / 2, 75, 175);

    Utils.setPos(supermanDiv, this);
    Utils.setSize(supermanDiv, this);

    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "s") {
        this.change("DOWN");
      } else if (e.key === "ArrowUp" || e.key === "w") {
        this.change("UP");
      }
    });

    window.addEventListener("click", () => {
      const bullet = new Bullet(
        this.position.x + 10,
        this.position.y,
        Superman.bullets.list.length
      );

      Superman.bullets.list.push(bullet);
    });
  }

  // destroy() {
  //   clearInterval(this.update);
  //   //TODO: DOM Update
  // }

  get location() {
    return this.position;
  }

  change(dir: "UP" | "DOWN") {
    if (dir === "UP") {
      if (this.position.y - this.size.height / 2 - this.move > OFFSET) {
        this.position.y -= this.move;
      }
    } else {
      if (
        this.position.y + this.size.height / 2 + this.move <
        window.innerHeight - OFFSET
      ) {
        this.position.y += this.move;
      }
    }

    Utils.setPos(supermanDiv, this);
  }
}

class Bullet extends Item {
  private velocity = 5;
  public index: number;
  private update: number;
  private div: HTMLDivElement;

  constructor(x: number, y: number, index: number) {
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
      // TODO: Update in DOM
    }, TICK_RATE);

    this.index = index;
    // TODO: Update in DOM
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

  private div: HTMLDivElement;

  constructor(index: number) {
    const health = Utils.getRandomNum(40, 20, 10);
    const size = health * 2;

    super(
      window.innerWidth,
      Utils.getRandomNum(window.innerHeight - OFFSET, OFFSET),
      size,
      size
    );
    this.index = index;

    this.div = document.createElement("div");
    this.div.classList.add("obstacle");
    Utils.setSize(this.div, this);
    obstacleContainer.appendChild(this.div);

    this.health = {
      original: health,
      remaining: health,
    };

    this.size = {
      width: size,
      height: size,
    };

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
    Game.incr(BULLET_DAMAGE);
    this.health.remaining -= BULLET_DAMAGE;
    this.size.height = this.size.width = this.health.remaining;
    Utils.setPos(this.div, this);
    Utils.setSize(this.div, this);
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

(() => {
  const superman = new Superman();
  Utils.randomSpawn(Game.spawnObstacles);

  setInterval(() => {
    Game.obstacles.list.forEach((obstacle) => {
      if (obstacle === null) {
        return;
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
  }, TICK_RATE);
})();