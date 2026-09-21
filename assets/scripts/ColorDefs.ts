import { Color, SpriteFrame } from 'cc';

export interface BubbleColor {
    key: string;
    name: string;
    hex: string;
    tint: Color;
    pitch: number;   // 颜色专属爆破音音高（相对基准）
    audio: string;   // resources 中的音频 key
}

export const COLORS: Record<string, BubbleColor> = {
    red: {
        key: 'red', name: 'Red', hex: '#FF3B5C',
        tint: new Color(255, 59, 92, 255), pitch: 0.62, audio: 'pop_red',
    },
    orange: {
        key: 'orange', name: 'Orange', hex: '#FF7A29',
        tint: new Color(255, 122, 41, 255), pitch: 0.78, audio: 'pop_orange',
    },
    yellow: {
        key: 'yellow', name: 'Yellow', hex: '#FFC400',
        tint: new Color(255, 196, 0, 255), pitch: 0.95, audio: 'pop_yellow',
    },
    green: {
        key: 'green', name: 'Green', hex: '#22C55E',
        tint: new Color(34, 197, 94, 255), pitch: 1.15, audio: 'pop_green',
    },
    cyan: {
        key: 'cyan', name: 'Cyan', hex: '#00C2D1',
        tint: new Color(0, 194, 209, 255), pitch: 1.4, audio: 'pop_cyan',
    },
    blue: {
        key: 'blue', name: 'Blue', hex: '#2563EB',
        tint: new Color(37, 99, 235, 255), pitch: 1.7, audio: 'pop_blue',
    },
    violet: {
        key: 'violet', name: 'Violet', hex: '#7C3AED',
        tint: new Color(124, 58, 237, 255), pitch: 2.0, audio: 'pop_violet',
    },
};

export const RAINBOW_AUDIO = 'pop_rainbow';

/** 按颜色烘焙的泡泡纹理（GameManager 启动时加载，Bubble 渲染时使用） */
export const BUBBLE_FRAMES: Record<string, SpriteFrame | null> = {};

/** 彩虹泡泡循环流动使用的颜色序列 */
export const RAINBOW_SEQ: Color[] = [
    new Color(255, 59, 92, 255),
    new Color(255, 122, 41, 255),
    new Color(255, 196, 0, 255),
    new Color(34, 197, 94, 255),
    new Color(0, 194, 209, 255),
    new Color(37, 99, 235, 255),
    new Color(124, 58, 237, 255),
];
