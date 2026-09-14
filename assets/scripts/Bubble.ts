import { _decorator, Component, Node, Sprite, SpriteFrame, Color, tween, Tween, Vec3, UITransform, Graphics, Layers } from 'cc';
import { COLORS, BUBBLE_FRAMES } from './ColorDefs';
const { ccclass, property } = _decorator;

@ccclass('Bubble')
export class Bubble extends Component {
    @property({ type: SpriteFrame })
    normalSF: SpriteFrame = null!;
    @property({ type: SpriteFrame })
    popSF: SpriteFrame = null!;

    private _isPop = false;
    private sprite: Sprite = null!;
    private originScale = 1;
    private baseFrame: SpriteFrame | null = null;
    private colorKey = 'yellow';
    private isRainbow = false;
    private isChanging = false;
    private isLocked = false;
    private changeIdx = 0;
    private static CHANGE_KEYS = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'violet'];

    get isPopped(): boolean {
        return this._isPop;
    }

    get color(): string {
        return this.colorKey;
    }

    get rainbow(): boolean {
        return this.isRainbow;
    }

    get changing(): boolean {
        return this.isChanging;
    }

    get locked(): boolean {
        return this.isLocked;
    }

    onLoad() {
        this.sprite = this.getComponent(Sprite)!;
        this.baseFrame = this.sprite.spriteFrame;
        this.originScale = this.node.scale.x;
    }

    /** 设置泡泡颜色（普通泡泡） */
    setColor(key: string) {
        this.stopChanging();
        this.clearRainbowRing();
        this.setLocked(false);
        this.colorKey = key;
        this.isRainbow = false;
        // 注意：新建的 Tween 实例调用 stop() 是空操作，必须用 stopAllByTarget
        Tween.stopAllByTarget(this.sprite);
        const sp = this.getComponent(Sprite)!;
        this.sprite = sp;
        const frame = BUBBLE_FRAMES[key];
        if (frame) {
            // 使用烘焙好的彩色立体泡泡纹理，保持高光与膜面质感
            sp.spriteFrame = frame;
            sp.color = Color.WHITE;
        } else {
            // 纹理尚未加载完时的兜底：整体染色
            sp.color = COLORS[key] ? COLORS[key].tint : Color.WHITE;
        }
    }

    /** 彩虹泡泡：静态多彩彩虹纹理（固定不变），可匹配任意目标色 */
    setRainbow() {
        this.stopChanging();
        this.setLocked(false);
        this.clearRainbowRing();
        this.colorKey = 'rainbow';
        this.isRainbow = true;
        this.isChanging = false;
        const sp = this.getComponent(Sprite)!;
        this.sprite = sp;
        Tween.stopAllByTarget(this.sprite);
        // 使用静态彩虹纹理；若纹理尚未加载完成则先用基座纹理+暖白兜底
        const frame = BUBBLE_FRAMES['rainbow'];
        if (frame) {
            sp.spriteFrame = frame;
            sp.color = Color.WHITE;
        } else if (this.baseFrame) {
            sp.spriteFrame = this.baseFrame;
            sp.color = new Color(255, 247, 238, 255);
        }
    }

    /** 变色泡泡：红→橙→黄→绿→青→蓝→紫 循环，当前颜色 = 目标色时才可击破 */
    setChanging() {
        this.clearRainbowRing();
        this.setLocked(false);
        this.isRainbow = false;
        this.isChanging = true;
        this.changeIdx = randomIndex();
        this.colorKey = Bubble.CHANGE_KEYS[this.changeIdx];
        this.applyColor(this.colorKey);
    }

    /** 由 GameManager.update 驱动：推进到下一个颜色 */
    cycleNext() {
        if (!this.isChanging || this._isPop) return;
        this.changeIdx = (this.changeIdx + 1) % Bubble.CHANGE_KEYS.length;
        this.colorKey = Bubble.CHANGE_KEYS[this.changeIdx];
        this.applyColor(this.colorKey);
    }

    private stopChanging() {
        this.isChanging = false;
    }

    private applyColor(key: string) {
        const sp = this.getComponent(Sprite)!;
        this.sprite = sp;
        const frame = BUBBLE_FRAMES[key];
        if (frame) {
            sp.spriteFrame = frame;
            sp.color = Color.WHITE;
        } else {
            sp.color = COLORS[key] ? COLORS[key].tint : Color.WHITE;
        }
    }

    /** 击破：像肥皂泡一样放大并淡出消失（配合粒子爆裂） */
    pop() {
        if (this._isPop) return;
        this._isPop = true;
        this.stopChanging();
        this.clearRainbowRing();
        Tween.stopAllByTarget(this.sprite);
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(0.14, { scale: new Vec3(this.originScale * 1.35, this.originScale * 1.35, 1) }, { easing: 'quadOut' })
            .start();
        tween(this.sprite)
            .to(0.14, { color: new Color(255, 255, 255, 0) }, { easing: 'quadOut' })
            .start();
        // 通知父节点：泡泡破裂（带节点引用、颜色信息，供连锁/音效/刷新使用）
        this.node.emit('bubblePop', this.node.position, this.node, this.colorKey, this.isRainbow);
    }

    /** 相邻震动：短促的放大回落脉冲 */
    shake() {
        if (this._isPop) return;
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(0.06, { scale: new Vec3(this.originScale * 1.12, this.originScale * 1.12, 1) }, { easing: 'quadOut' })
            .to(0.08, { scale: new Vec3(this.originScale, this.originScale, 1) }, { easing: 'quadIn' })
            .start();
    }

    resetBubble() {
        this._isPop = false;
        this.stopChanging();
        this.clearRainbowRing();
        this.setLocked(false);
        // 关键：必须真正掐掉击破时的“放大 + 淡出”动画，
        // 否则补位后的新泡泡会被旧动画拉到全透明并保持 1.35 倍缩放 —— 表现为“没有补位”
        Tween.stopAllByTarget(this.node);
        Tween.stopAllByTarget(this.sprite);
        this.node.setScale(this.originScale, this.originScale, 1);
        // 关键：泡泡使用后就不是彩虹了——还原为普通颜色，
        // 之后是否变成彩虹由外部 setRainbow() 显式调用决定，不再"自带"彩虹身份
        this.isRainbow = false;
        if (this.colorKey === 'rainbow') this.colorKey = 'yellow';
        const frame = BUBBLE_FRAMES[this.colorKey];
        if (frame) {
            this.sprite.spriteFrame = frame;
            this.sprite.color = Color.WHITE;
        } else {
            this.sprite.color = COLORS[this.colorKey] ? COLORS[this.colorKey].tint : Color.WHITE;
        }
        // 兜底：确保不残留半透明状态（某些机型上动画被中断时会留下 alpha=0）
        if (this.sprite.color.a < 255) this.sprite.color = Color.WHITE;
    }

    private ensureRainbowRing() {
        if (this.node.getChildByName('RainbowRing')) return;
        const ring = new Node('RainbowRing');
        ring.addComponent(UITransform).setContentSize(64, 64);
        const g = ring.addComponent(Graphics);
        g.lineWidth = 3.5;
        g.strokeColor = new Color(178, 150, 255, 255);
        g.circle(0, 0, 30);
        g.stroke();
        this.node.addChild(ring);
    }

    private clearRainbowRing() {
        const ring = this.node.getChildByName('RainbowRing');
        if (ring) ring.destroy();
    }

    /** 锁定泡泡：未解锁前不可爆破（需先炸掉相邻任意泡泡） */
    setLocked(on: boolean) {
        this.isLocked = on;
        const old = this.node.getChildByName('LockIcon');
        if (old) old.destroy();
        if (!on) return;
        const icon = new Node('LockIcon');
        icon.layer = Layers.Enum.UI_2D;
        icon.addComponent(UITransform).setContentSize(36, 36);
        const g = icon.addComponent(Graphics);
        // 半透明深色圆底 + 白色锁形
        g.fillColor = new Color(70, 92, 118, 150);
        g.circle(0, 0, 13);
        g.fill();
        g.lineWidth = 3;
        g.strokeColor = new Color(255, 255, 255, 230);
        g.moveTo(-5, 1);
        g.lineTo(-5, 5);
        g.arc(0, 5, 5, Math.PI, 0, false);
        g.lineTo(5, 1);
        g.stroke();
        g.fillColor = new Color(255, 255, 255, 235);
        g.roundRect(-6, -7, 12, 9, 2);
        g.fill();
        this.node.addChild(icon);
    }
}

function randomIndex(): number {
    return Math.floor(Math.random() * 7);
}
