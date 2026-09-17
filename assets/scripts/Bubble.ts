import { _decorator, Component, Node, Sprite, SpriteFrame, Color, tween, Tween, Vec3, UITransform, UIOpacity, Graphics, Layers } from 'cc';
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
        const old = this.node.getChildByName('LockIcon');
        const wasLocked = this.isLocked;
        this.isLocked = on;
        if (!on) {
            // 解锁演出：罩子/冰面轻轻裂开淡出（只在真的从“锁定”变“解锁”时播）
            if (old && wasLocked) {
                const op = old.getComponent(UIOpacity) || old.addComponent(UIOpacity);
                tween(old)
                    .to(0.22, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'quadOut' })
                    .call(() => { if (old.isValid) old.destroy(); })
                    .start();
                tween(op).to(0.22, { opacity: 0 }, { easing: 'quadOut' }).start();
            } else if (old) {
                old.destroy();
            }
            return;
        }
        const icon = new Node('LockIcon');
        icon.layer = Layers.Enum.UI_2D;
        icon.addComponent(UITransform).setContentSize(72, 72);
        const g = icon.addComponent(Graphics);
        const R = 30;
        switch (Bubble.lockStyle) {
        case 5: // 冰封（当前正式效果，冰面较浅，尽量透出泡泡本色）
            drawIce(g, R, 108);
            break;
        case 6: // 冰封 + 右下小锁徽章
            drawIce(g, R, 108);
            drawLockGlyph(g, R * 0.52, -R * 0.5, 0.58, new Color(46, 84, 120, 165),
                new Color(255, 255, 255, 245), new Color(255, 255, 255, 245));
            break;
        case 7: // 冰封·浓（上一版浓度，仅用于对比）
            drawIce(g, R, 168);
            break;
        case 1: // 纯透明罩：像给泡泡盖了一层玻璃罩
            drawDome(g, R);
            break;
        case 2: // 透明罩 + 右下小锁徽章（可读性最好）
            drawDome(g, R);
            drawLockGlyph(g, R * 0.52, -R * 0.5, 0.6, new Color(58, 78, 104, 165),
                new Color(255, 255, 255, 240), new Color(255, 255, 255, 240));
            break;
        case 3: // 轻量线稿锁：更淡的罩 + 无深色底的白色小锁（带 1px 阴影保证浅色底也可读）
            drawDome(g, R, 44);
            drawLockGlyph(g, 0, 0, 0.74, null, new Color(58, 82, 112, 165), new Color(58, 82, 112, 165));
            drawLockGlyph(g, 0, 0, 0.70, null, new Color(255, 255, 255, 250), new Color(255, 255, 255, 250));
            break;
        case 4: // 备用：虚线环 + 中央小锁
            drawDashedRing(g, R - 1);
            drawLockGlyph(g, 0, 0, 0.78, new Color(70, 92, 118, 120),
                new Color(255, 255, 255, 235), new Color(255, 255, 255, 235));
            break;
        default: // 0：原样式（深色圆底 + 白色锁）
            drawLockGlyph(g, 0, 0, 1, new Color(70, 92, 118, 150),
                new Color(255, 255, 255, 235), new Color(255, 255, 255, 235));
            break;
        }
        this.node.addChild(icon);
    }

    /** 锁的视觉样式：5 冰封(浅,当前) / 6 冰封+小锁 / 7 冰封(浓,对比用) / 0 旧圆底锁 / 1 透明罩 / 2 罩+小锁 / 3 线稿锁 / 4 虚线环 */
    static lockStyle = 5;
}

function randomIndex(): number {
    return Math.floor(Math.random() * 7);
}

/** 半透明“泡泡罩”：外缘柔光 + 磨砂罩体 + 亮边 + 左上高光弧 + 小反光点 */
function drawDome(g: Graphics, R: number, veil = 62) {
    g.lineWidth = 7;
    g.strokeColor = new Color(255, 255, 255, 55);
    g.circle(0, 0, R);
    g.stroke();

    g.fillColor = new Color(255, 255, 255, veil);
    g.circle(0, 0, R - 1);
    g.fill();

    g.lineWidth = 2;
    g.strokeColor = new Color(255, 255, 255, 168);
    g.circle(0, 0, R - 2.4);
    g.stroke();

    // 右下边缘的折射亮边（玻璃感）
    const a0 = Math.PI * -0.46;
    const a1 = Math.PI * -0.06;
    g.lineWidth = 3.4;
    g.strokeColor = new Color(255, 255, 255, 150);
    g.moveTo(Math.cos(a0) * (R - 2.4), Math.sin(a0) * (R - 2.4));
    g.arc(0, 0, R - 2.4, a0, a1, false);
    g.stroke();

    // 左上高光弧
    const b0 = Math.PI * 0.60;
    const b1 = Math.PI * 1.16;
    const hr = R * 0.62;
    g.lineWidth = 5;
    g.strokeColor = new Color(255, 255, 255, 135);
    g.moveTo(Math.cos(b0) * hr, Math.sin(b0) * hr);
    g.arc(0, 0, hr, b0, b1, false);
    g.stroke();

    g.fillColor = new Color(255, 255, 255, 140);
    g.circle(-R * 0.42, R * 0.38, R * 0.085);
    g.fill();
}

/** 虚线圆环：低对比深色垫底 + 白色短弧 */
function drawDashedRing(g: Graphics, R: number) {
    const N = 12;
    for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2 + 0.07;
        const a1 = a0 + (Math.PI * 2) / N - 0.26;
        g.lineWidth = 5.4;
        g.strokeColor = new Color(62, 84, 112, 60);
        g.moveTo(Math.cos(a0) * R, Math.sin(a0) * R);
        g.arc(0, 0, R, a0, a1, false);
        g.stroke();
        g.lineWidth = 3.2;
        g.strokeColor = new Color(255, 255, 255, 210);
        g.moveTo(Math.cos(a0) * R, Math.sin(a0) * R);
        g.arc(0, 0, R, a0, a1, false);
        g.stroke();
    }
}

/** 冰封：冷雾外圈 + 半透明冰面 + 冰晶切面 + 霜点 + 左上闪光（veil 越小冰面越浅） */
function drawIce(g: Graphics, R: number, veil = 108) {
    // 外圈冷雾
    g.lineWidth = 8;
    g.strokeColor = new Color(176, 216, 240, 58);
    g.circle(0, 0, R);
    g.stroke();

    // 冰面
    g.fillColor = new Color(210, 234, 248, veil);
    g.circle(0, 0, R - 1);
    g.fill();

    // 冰晶切面（两块），让冰面有“冻住”的体积感
    g.fillColor = new Color(255, 255, 255, 52);
    g.moveTo(-R * 0.78, R * 0.16);
    g.lineTo(-R * 0.05, R * 0.92);
    g.lineTo(R * 0.52, R * 0.06);
    g.close();
    g.fill();

    g.fillColor = new Color(255, 255, 255, 40);
    g.moveTo(-R * 0.28, -R * 0.88);
    g.lineTo(R * 0.82, -R * 0.14);
    g.lineTo(-R * 0.02, R * 0.22);
    g.close();
    g.fill();

    // 冰缘亮边
    g.lineWidth = 2.6;
    g.strokeColor = new Color(238, 250, 255, 225);
    g.circle(0, 0, R - 2);
    g.stroke();

    // 霜点
    g.fillColor = new Color(255, 255, 255, 180);
    g.circle(R * -0.44, R * 0.50, R * 0.07);
    g.circle(R * 0.50, R * 0.34, R * 0.055);
    g.circle(R * 0.22, R * -0.62, R * 0.06);
    g.circle(R * -0.60, R * -0.30, R * 0.05);
    g.fill();

    // 左上十字闪光
    g.lineWidth = 2.2;
    g.strokeColor = new Color(255, 255, 255, 225);
    g.moveTo(R * -0.52, R * 0.44);
    g.lineTo(R * -0.30, R * 0.44);
    g.moveTo(R * -0.41, R * 0.33);
    g.lineTo(R * -0.41, R * 0.55);
    g.stroke();
}

/** 锁形图标：可选圆形底 + 锁梁 + 锁体，整体按 s 缩放并平移到 (cx, cy) */
function drawLockGlyph(g: Graphics, cx: number, cy: number, s: number, badge: Color | null, ink: Color, body?: Color) {
    if (badge && badge.a > 0) {
        g.fillColor = badge;
        g.circle(cx, cy, 13 * s);
        g.fill();
    }
    g.lineWidth = 3 * s;
    g.strokeColor = ink;
    g.moveTo(cx - 5 * s, cy + 1 * s);
    g.lineTo(cx - 5 * s, cy + 5 * s);
    g.arc(cx, cy + 5 * s, 5 * s, Math.PI, 0, false);
    g.lineTo(cx + 5 * s, cy + 1 * s);
    g.stroke();
    g.fillColor = body ?? ink;
    g.roundRect(cx - 6 * s, cy - 7 * s, 12 * s, 9 * s, 2 * s);
    g.fill();
}
