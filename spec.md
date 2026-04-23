# 戰鬥陀螺約戰系統 — 完整 MVP Spec & 技術選型

> 供 Claude Code 直接執行的完整規格文件

-----

## 一、產品概述

**產品名稱**：BeyBattle（暫定）
**定位**：讓陀螺玩家像玩網遊一樣「開房約戰」，解決線下找對手難、揪人麻煩的問題。
**平台**：iOS + Android（React Native + Expo）
**MVP 範圍**：帳號系統、開房、找房、加入房間、推播通知、深淺色主題切換

-----

## 二、技術選型

### 完整技術棧

|層級       |技術                                         |說明                                         |
|---------|-------------------------------------------|-------------------------------------------|
|App 框架   |React Native + Expo SDK 51                 |雙平台、Expo Go 即時預覽                           |
|語言       |TypeScript                                 |Claude Code 產出品質更穩                         |
|導航       |Expo Router v3（file-based）                 |類 Next.js 結構，直覺                            |
|後端 / BaaS|Supabase                                   |Auth + Postgres + Realtime + Edge Functions|
|推播通知     |Expo Notifications + Supabase Edge Function|                                           |
|狀態管理     |Zustand                                    |輕量，適合 MVP                                  |
|表單       |React Hook Form + Zod                      |型別安全驗證                                     |
|UI 元件    |自製（基於 StyleSheet）                          |避免外部 UI 庫鎖定                                |
|主題系統     |React Context + Zustand + AsyncStorage     |深淺色持久化                                     |
|日期時間     |date-fns                                   |輕量                                         |
|地圖超連結    |純字串，無 SDK                                  |`maps.google.com/?q=地址`                    |
|圖示       |@expo/vector-icons (Ionicons)              |                                           |

### 專案初始化指令

```bash
# 建立專案
npx create-expo-app@latest beybattle --template expo-template-blank-typescript
cd beybattle

# 安裝核心依賴
npx expo install expo-router expo-linking expo-constants expo-status-bar
npx expo install @supabase/supabase-js
npx expo install expo-notifications expo-device
npx expo install @react-native-async-storage/async-storage
npx expo install expo-secure-store
npx expo install react-native-url-polyfill

# 安裝 npm 依賴
npm install zustand react-hook-form zod @hookform/resolvers
npm install date-fns
npm install @expo/vector-icons

# 設定 app.json 的 scheme（deep link 用）
# 在 app.json 加入 "scheme": "beybattle"
```

-----

## 三、Supabase 資料庫 Schema

> 在 Supabase Dashboard → SQL Editor 執行以下 SQL

```sql
-- =====================
-- 啟用 UUID 擴充
-- =====================
create extension if not exists "uuid-ossp";

-- =====================
-- 使用者 Profile
-- =====================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text not null unique,
  avatar_url text,
  city text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 新用戶自動建立 profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================
-- 房間（Battle Room）
-- =====================
create type battle_type as enum ('free_for_all', 'one_vs_one', 'team');
create type room_status as enum ('open', 'full', 'in_progress', 'ended', 'cancelled');

create table public.rooms (
  id uuid default uuid_generate_v4() primary key,
  host_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  battle_type battle_type not null default 'free_for_all',
  scheduled_at timestamptz not null,
  location_text text not null,
  location_url text,              -- Google Maps 超連結，由前端自動產生
  max_players int not null default 4,
  current_players int not null default 1,
  rules text,                     -- 自由文字備註
  is_private boolean not null default false,
  password_hash text,             -- 密碼房用，null 表示公開房
  status room_status not null default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint max_players_range check (max_players between 2 and 32),
  constraint current_players_valid check (current_players <= max_players)
);

-- =====================
-- 房間參與者
-- =====================
create table public.room_participants (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique(room_id, user_id)
);

-- =====================
-- 推播 Token
-- =====================
create table public.push_tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  token text not null unique,
  created_at timestamptz default now()
);

-- =====================
-- Row Level Security
-- =====================

-- profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- rooms
alter table public.rooms enable row level security;
create policy "Public rooms are viewable by everyone" on public.rooms for select using (is_private = false or host_id = auth.uid());
create policy "Authenticated users can create rooms" on public.rooms for insert with check (auth.uid() = host_id);
create policy "Host can update own room" on public.rooms for update using (auth.uid() = host_id);
create policy "Host can delete own room" on public.rooms for delete using (auth.uid() = host_id);

-- room_participants
alter table public.room_participants enable row level security;
create policy "Participants viewable by everyone" on public.room_participants for select using (true);
create policy "Users can join rooms" on public.room_participants for insert with check (auth.uid() = user_id);
create policy "Users can leave rooms" on public.room_participants for delete using (auth.uid() = user_id);

-- push_tokens
alter table public.push_tokens enable row level security;
create policy "Users manage own tokens" on public.push_tokens for all using (auth.uid() = user_id);

-- =====================
-- 自動更新 current_players
-- =====================
create or replace function update_room_player_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.rooms
    set current_players = current_players + 1,
        status = case when current_players + 1 >= max_players then 'full' else 'open' end,
        updated_at = now()
    where id = NEW.room_id;
  elsif TG_OP = 'DELETE' then
    update public.rooms
    set current_players = current_players - 1,
        status = 'open',
        updated_at = now()
    where id = OLD.room_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_participant_change
  after insert or delete on public.room_participants
  for each row execute procedure update_room_player_count();
```

-----

## 四、專案目錄結構

```
beybattle/
├── app/                          # Expo Router pages
│   ├── (auth)/
│   │   ├── login.tsx             # 登入頁
│   │   └── register.tsx          # 註冊頁
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab bar 設定
│   │   ├── index.tsx             # 大廳（找房列表）
│   │   ├── create.tsx            # 開房
│   │   └── profile.tsx           # 個人頁
│   ├── room/
│   │   └── [id].tsx              # 房間詳情頁
│   └── _layout.tsx               # Root layout（主題 Provider）
│
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Avatar.tsx
│   │   ├── RoomCard.tsx          # 房間卡片
│   │   ├── RoomFilter.tsx        # 篩選列
│   │   ├── ParticipantList.tsx   # 參戰者名單
│   │   └── ThemeToggle.tsx       # 深淺色切換按鈕
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useRooms.ts
│   │   ├── useRoom.ts            # 單房間（含 Realtime）
│   │   └── useTheme.ts
│   │
│   ├── store/
│   │   ├── authStore.ts          # Zustand auth 狀態
│   │   └── themeStore.ts         # 主題狀態（含 AsyncStorage 持久化）
│   │
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client
│   │   └── notifications.ts      # Expo Notifications 工具
│   │
│   ├── theme/
│   │   ├── colors.ts             # 深色 / 淺色 token
│   │   ├── typography.ts         # 字型設定
│   │   ├── spacing.ts            # 間距 token
│   │   └── index.ts
│   │
│   └── utils/
│       ├── mapLink.ts            # 產生 Google Maps 超連結
│       └── formatDate.ts
│
├── .env                          # SUPABASE_URL, SUPABASE_ANON_KEY
└── app.json
```

-----

## 五、主題系統實作規格

### 色彩 Token（`src/theme/colors.ts`）

```typescript
export const darkColors = {
  // 背景
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  border: '#2E2E2E',

  // 文字
  textPrimary: '#F0F0F0',
  textSecondary: '#9A9A9A',
  textMuted: '#555555',

  // 品牌色（陀螺能量感：深藍 + 電光藍）
  primary: '#0EA5E9',
  primaryDark: '#0284C7',
  accent: '#38BDF8',

  // 狀態色
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#6366F1',

  // 房間狀態
  statusOpen: '#22C55E',
  statusFull: '#EF4444',
  statusEnding: '#F59E0B',
};

export const lightColors = {
  // 背景
  background: '#F8F8F8',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E5E5E5',

  // 文字
  textPrimary: '#111111',
  textSecondary: '#555555',
  textMuted: '#AAAAAA',

  // 品牌色
  primary: '#0284C7',
  primaryDark: '#0369A1',
  accent: '#0EA5E9',

  // 狀態色
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#4F46E5',

  // 房間狀態
  statusOpen: '#16A34A',
  statusFull: '#DC2626',
  statusEnding: '#D97706',
};

export type ColorTheme = typeof darkColors;
```

### 主題 Store（`src/store/themeStore.ts`）

```typescript
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, ColorTheme } from '../theme/colors';

type ThemeMode = 'dark' | 'light';

interface ThemeStore {
  mode: ThemeMode;
  colors: ColorTheme;
  toggle: () => void;
  init: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: 'dark',
  colors: darkColors,
  toggle: async () => {
    const next = get().mode === 'dark' ? 'light' : 'dark';
    set({ mode: next, colors: next === 'dark' ? darkColors : lightColors });
    await AsyncStorage.setItem('themeMode', next);
  },
  init: async () => {
    const saved = await AsyncStorage.getItem('themeMode') as ThemeMode | null;
    if (saved) {
      set({ mode: saved, colors: saved === 'dark' ? darkColors : lightColors });
    }
  },
}));
```

### Root Layout（`app/_layout.tsx`）

```typescript
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useThemeStore } from '../src/store/themeStore';

export default function RootLayout() {
  const { init, mode } = useThemeStore();

  useEffect(() => { init(); }, []);

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
```

-----

## 六、Supabase Client（`src/lib/supabase.ts`）

```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 環境變數（`.env`）

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

-----

## 七、各頁面詳細規格

### 7.1 大廳頁 `(tabs)/index.tsx`

**功能：**

- 頂部：App Logo + 主題切換按鈕（右上角日/月圖示）
- 篩選列：全部 / 開放中 / 即將額滿（水平捲動 Chip）
- 房間列表：FlatList，每張 RoomCard 顯示以下資訊：
  - 對戰標題
  - 對戰類型 Badge（自由亂戰 / 1v1 / 組隊）
  - 時間（格式：`MM/DD HH:mm`）
  - 地點文字
  - 人數進度條（`currentPlayers / maxPlayers`）
  - 房間狀態 Badge（開放中綠色 / 即將額滿橘色 / 已滿紅色）
  - 密碼房顯示鎖頭圖示
- 右下角 FAB（懸浮按鈕）：點擊跳轉開房頁
- 下拉刷新

**資料：** 呼叫 `useRooms()` hook，從 Supabase 拿 `rooms` table，過濾 `scheduled_at > now()` 且 `status != 'ended'`

-----

### 7.2 開房頁 `(tabs)/create.tsx`

**表單欄位（React Hook Form + Zod）：**

```typescript
const createRoomSchema = z.object({
  title: z.string().min(2, '最少 2 個字').max(30, '最多 30 個字'),
  battle_type: z.enum(['free_for_all', 'one_vs_one', 'team']),
  scheduled_date: z.date(),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/),
  location_text: z.string().min(3, '請輸入地址'),
  max_players: z.number().min(2).max(32),
  rules: z.string().max(200).optional(),
  is_private: z.boolean().default(false),
  password: z.string().min(4).max(20).optional(),
});
```

**UI 互動：**

- `is_private` 切換 → 顯示/隱藏密碼輸入框
- `max_players` 用 +/- 步進器（Stepper）操作，預設 4
- `battle_type` 用 3 個切換按鈕（SegmentedControl 風格）
- 日期選擇器：使用 `@react-native-community/datetimepicker`
- 送出時：
1. 密碼 hash（使用 `bcrypt` 或簡單 SHA256）存入 DB
1. 自動產生 `location_url = https://maps.google.com/?q=${encodeURIComponent(location_text)}`
1. 插入 `rooms` table
1. 插入 `room_participants`（房主自動加入）
1. 跳轉至房間詳情頁

-----

### 7.3 房間詳情頁 `room/[id].tsx`

**區塊：**

1. **Header**
- 對戰標題（大字）
- 對戰類型 Badge
- 房間狀態 Badge
1. **時間地點卡**
- 🕐 時間：`YYYY年MM月DD日 HH:mm`
- 📍 地點：文字 + 「開啟地圖」超連結按鈕
  - 點擊執行：`Linking.openURL(room.location_url)`
1. **人數卡**
- 進度條
- `已有 X / Y 人報名`
- 倒計時（距離開賽還有 X 天 X 小時）
1. **規則卡**（如有填寫才顯示）
- 規則文字
1. **參戰者名單**
- Avatar 列表
- 房主有皇冠圖示
- 密碼房：房主可點擊踢人（顯示踢人按鈕）
1. **底部按鈕**
- 未加入：「加入約戰」按鈕（密碼房先彈出密碼輸入 Modal）
- 已加入（非房主）：「退出約戰」按鈕（灰色）
- 房主：「關閉房間」按鈕（紅色）

**Realtime：** 用 Supabase Realtime 訂閱 `room_participants` 變更，參戰名單即時更新

-----

### 7.4 個人頁 `(tabs)/profile.tsx`

- 顯示頭像、暱稱、城市
- 編輯個人資料
- 「我開的房」列表（過濾 `host_id = user.id`）
- 「我加入的房」列表（過濾 `room_participants.user_id = user.id`）
- 登出按鈕
- 主題切換（同頂部按鈕，冗餘放置）

-----

### 7.5 登入 / 註冊頁

**登入（`(auth)/login.tsx`）：**

- Email + 密碼
- 「還沒帳號？註冊」跳轉

**註冊（`(auth)/register.tsx`）：**

- Email + 密碼 + 暱稱 + 城市（選填）
- 呼叫 `supabase.auth.signUp`
- 成功後跳轉大廳

-----

## 八、推播通知規格

### 前端：取得 Token（`src/lib/notifications.ts`）

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';

export async function registerPushToken(userId: string) {
  if (!Device.isDevice) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  await supabase.from('push_tokens').upsert(
    { user_id: userId, token },
    { onConflict: 'token' }
  );

  return token;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```

### 後端：Supabase Edge Function

建立 `supabase/functions/send-notification/index.ts`：

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { tokens, title, body, data } = await req.json();

  const messages = tokens.map((token: string) => ({
    to: token,
    title,
    body,
    data,
    sound: 'default',
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  return new Response(JSON.stringify(await response.json()), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### 通知觸發時機

|事件      |收到通知的對象|內容                      |
|--------|-------|------------------------|
|有人加入我的房間|房主     |`「{username}」加入了你的約戰！`  |
|有人退出我的房間|房主     |`「{username}」退出了約戰`     |
|加入成功    |加入者    |`已成功報名「{title}」，記得準時出現！`|
|開賽前 1 小時|所有參與者  |`約戰「{title}」1 小時後開始！`   |
|房間被關閉   |所有參與者  |`約戰「{title}」已被取消`       |

-----

## 九、地圖超連結工具（`src/utils/mapLink.ts`）

```typescript
import { Linking, Platform } from 'react-native';

export function generateMapUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  // iOS 優先使用 Apple Maps，Android 使用 Google Maps
  if (Platform.OS === 'ios') {
    return `maps://?q=${encoded}`;
  }
  return `https://maps.google.com/?q=${encoded}`;
}

export async function openMap(address: string) {
  const url = generateMapUrl(address);
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // 備援：永遠可以開的 Google Maps 網頁版
    await Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`);
  }
}
```

-----

## 十、UI 設計規格

### 設計風格

**主題**：電競暗色系 + 乾淨線條。深色模式為預設，帶有電光藍品牌色，傳遞「能量」與「對戰」感。淺色模式維持清爽高對比。

### 字型

```typescript
// src/theme/typography.ts
export const typography = {
  // 標題：Bebas Neue（需透過 expo-font 載入）或系統黑體
  displayFont: 'BebasNeue_400Regular',
  // 內文：系統字型（iOS: SF Pro, Android: Roboto）
  bodyFont: 'System',

  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 32,
  },

  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  },
};
```

載入字型：

```bash
npx expo install @expo-google-fonts/bebas-neue expo-font
```

### 間距系統

```typescript
// src/theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};
```

### 圓角與陰影

```typescript
export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// 深色模式陰影
export const shadowDark = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 12,
  elevation: 8,
};

// 淺色模式陰影
export const shadowLight = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 4,
};
```

-----

## 十一、核心元件規格

### RoomCard（`src/components/RoomCard.tsx`）

顯示欄位：

- 標題（粗體，最多 2 行截斷）
- 對戰類型 Badge（小圓角標籤）
- 時間圖示 + 文字
- 地點圖示 + 文字（最多 1 行截斷）
- 人數進度條（細長條，顏色依比例變化：< 60% 綠、60-90% 橘、≥ 90% 紅）
- 右上角：狀態 Badge + 鎖頭圖示（密碼房）

互動：整張卡片可點擊，跳轉 `room/[id]`

### ThemeToggle（`src/components/ThemeToggle.tsx`）

- 太陽（淺色模式）/ 月亮（深色模式）圖示按鈕
- 點擊呼叫 `useThemeStore().toggle()`
- 切換時有 0.2s 淡入淡出動畫

-----

## 十二、MVP 排除項目（明確不做）

- 線上對戰配對
- 積分 / 排名系統
- 支付功能
- 直播 / 影片
- 陀螺型別資料庫
- 戰績顯示
- 地圖嵌入（只做超連結）
- 複雜的社群功能（追蹤、動態牆）

-----

## 十三、開發執行順序建議

給 Claude Code 的執行優先順序：

```
Phase 1（基礎架構）
1. 初始化 Expo 專案，設定 app.json
2. 安裝所有依賴
3. 建立 src/theme/ 目錄（colors, typography, spacing）
4. 建立 themeStore + useTheme hook
5. 建立 Supabase client
6. 執行 SQL schema

Phase 2（認證）
7. 登入頁 UI + 邏輯
8. 註冊頁 UI + 邏輯
9. authStore + useAuth hook
10. Root layout 導航守衛（未登入導向 login）

Phase 3（核心功能）
11. RoomCard 元件
12. 大廳頁（列表 + 篩選）
13. 開房頁（表單 + 驗證）
14. 房間詳情頁（含 Realtime）
15. 個人頁

Phase 4（加值功能）
16. 推播通知（token 註冊 + Edge Function）
17. 主題切換動畫優化
18. 下拉刷新、空狀態畫面、載入骨架屏
```

-----

*文件版本：v1.0 MVP*
*更新日期：2026-04*
