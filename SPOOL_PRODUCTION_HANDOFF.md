# SPOOL — Current Production Handoff

版本：2026-08-23  
用途：把当前 Radio / cassette sampler 原样迁移到一个新的本地或生产环境。  
仓库：`https://github.com/felix0220/Spool`

## 1. 交接结论

这是当前项目的完整源码交接，不是一个截图，也不是一个重新搭建的简化版。它包含：

- React + Vite 应用源码
- 三个磁带与本地音频资源
- 读取舱、磁带拖拽、嵌入、吐出和前方面板
- 播放、暂停、拖动进度、音量、Tone / Space / Texture、Shuttle
- Mark / Return / Eject 控件
- waveform、meter、音频状态与素材捕获逻辑
- 现有测试、设计约束、参考资料和 Vercel 配置

当前工作树是用户持续迭代后的工作树，存在未提交的设计和工程变更。迁移时以本 handoff 压缩包里的全部文件为准，不要只复制某一个组件。

## 2. 新环境启动

推荐 Node.js 20 或更新版本。项目使用 npm，锁文件是 `package-lock.json`。

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 4173
```

打开：

```text
http://localhost:4173/?front=reference
```

生产构建预览：

```bash
npm ci
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

打开同一个 `?front=reference` 地址即可查看前方面板。

## 3. Vercel 部署

项目已经包含 `vercel.json`：

- build command：`npm run build`
- output directory：`dist/client`
- framework：Vite

若通过 Vercel CLI：

```bash
npm ci
npm run build
vercel --prod
```

当前 GitHub remote：

```text
https://github.com/felix0220/Spool.git
```

当前已知 Vercel 地址：

```text
https://spool-audio-deck.vercel.app
```

注意：当前工作树很脏，包含大量用户主动积累的未提交文件。不要在新环境里先执行 reset、clean 或 checkout 覆盖工作树。先复制本 handoff，再由用户决定哪些内容进入新的生产仓库。

## 4. 应用入口和代码分层

### 应用入口

`src/main.jsx`

- 立即挂载 React App。
- Lapse 只在开发环境异步加载。
- Lapse 不再阻塞 App 首次渲染；即使 inspector 不可用，也不应该让产品页面空白。

### 路由和主舞台

`src/App.jsx`

- 默认进入当前 Radio / cassette stage。
- `?front=reference` 显示当前前方面板。
- 仍保留项目中已有的 keyframe / prototype 路由入口，迁移时不要删除。

`src/components/GraphicDeckStage.jsx`

这是当前 canonical 的交互状态容器，负责：

- 三个磁带的选择和拖拽
- 读取舱开合
- 磁带 lock-in / eject 时序
- top view 到 front view 的过渡
- 当前音频和当前磁带的绑定
- 播放、暂停、seek、音量、速度
- Mark / Return / Eject
- 动画层级和遮罩关系

### 前方面板

`src/components/front/ReferenceFrontConsole.jsx`

当前前方面板的语义控件和视觉组件，包括：

- Tone Dial
- Space Dial
- Texture Dial
- Volume slider
- Shuttle slider
- Play / Pause Dial
- Mark
- Return
- Eject

相关文件：

- `src/front-reference.css`
- `src/components/front/front-reference-geometry.js`
- `src/components/front/control-inputs.js`
- `src/components/front/action-contract.js`
- `src/components/front/ToneDial.jsx`

### 音频层

`src/music/`

- `tracks.js`：磁带和音频的唯一映射
- `audio-source-lifecycle.js`：加载、切换、释放音频源
- `useAudioClock.js`：播放时间和进度时钟
- `audio-gain.js`：音量 / gain
- `useAudioProcessing.js`：Tone、Space、Texture 等处理
- `useTrackWaveform.js`、`waveform-cache.js`：波形数据
- `waveform-display.js`、`waveform-render.js`：波形显示
- `loop-region.js`、`capture-range.js`、`material-capture.js`：片段和捕获逻辑
- `signal-level-store.js`、`useSignalLevel.js`：右侧 signal / meter

### 其他视觉路线

`src/deck3d/` 和 `src/components/prototypes/` 是探索路线，不要把它们当作当前 canonical UI，也不要用它们替换 `GraphicDeckStage`，除非另行决定。

## 5. 当前三盘磁带与音频

唯一映射在 `src/music/tracks.js`：

| 磁带 | 标题 | 音频 | 许可 |
|---|---|---|---|
| Ember / 橙色 | Chill Lofi Inspired | `/audio/chill-lofi-inspired-loop.ogg` | CC0 |
| Blue / 蓝色 | Night Soul | `/audio/night-soul.mp3` | CC BY 4.0，Ketsa |
| Cream / 米色 | Cathedral Dust | `/audio/cathedral-dust.mp3` | Pixabay Content License |

音频文件位于 `public/audio/`。不要改成临时 object URL；刷新页面后仍必须从这些稳定路径加载。

来源和许可说明在：

- `public/audio/README.md`
- `src/music/tracks.js`

## 6. 当前交互合同

### 插入

1. 用户拖动磁带。
2. 指针未释放前，磁带不能被强行吸入。
3. 释放到有效区域后，磁带沿当前物理路径进入读取舱。
4. 孔位和读取件对齐后发生 lock-in。
5. 读取件确认后盖仓关闭。
6. 盖仓完成关闭和短暂稳定后，才转向正面。
7. 前方面板显示当前磁带和对应音频。

### 播放

- Play / Pause 是同一个旋钮式控件。
- 播放时 playhead、progress 和音频时钟同步。
- 暂停时保留当前位置。
- Stop 的旧逻辑不再作为前方面板的主要控制入口。

### Mark / Return

- 第一次按 Mark：记录当前播放位置并亮灯。
- 第二次按 Mark：清除 Mark、loop range 和捕获相关旧区间，并熄灯。
- 再次按 Mark：可以重新记录。
- Return 是瞬时动作：回到当前 Mark，并短暂显示反馈；它不是持续开关。
- 没有有效 Mark 时，Return 应禁用或不执行跳转。

### Eject

- Eject 清除当前 active audio state，但不破坏其余界面状态。
- 吐出时保留磁带与读取舱的视觉连续性。
- 磁带、钳件、盖仓和遮罩必须遵守明确层级，不能穿膜。

## 7. 当前已验证内容

最近一次 `npm run check` 的结果：

- production build：通过
- 主测试：94 项通过
- site 测试：4 项通过

HTTP 层也曾确认以下地址可以返回页面：

- `http://127.0.0.1:4173/?front=reference`
- `http://localhost:4173/?front=reference`
- `https://spool-audio-deck.vercel.app/?front=reference`

## 8. 尚未完全确认的风险

用户在当前 Codex 的共享浏览器里仍观察到“影片空白 / 页面没有内容”。目前已确认：构建成功、HTTP 返回成功、入口代码已改成先渲染 App 再异步加载 Lapse；但当前环境没有可用的浏览器 console / screenshot 自动读取能力，所以还不能把运行时视觉问题写成“已彻底解决”。

迁移到新的生产环境后，按下面顺序确认：

1. 删除旧的 `node_modules` 后运行 `npm ci`。
2. 运行 `npm run build`，确认 `dist/client/index.html` 存在。
3. 用 `npm run preview -- --host 127.0.0.1 --port 4173` 启动，而不是直接打开 `index.html`。
4. 访问 `/?front=reference`，不要省略 query。
5. 如果仍空白，先看浏览器 Console 的第一条红色错误；不要先改视觉 CSS。
6. 生产环境不需要安装 Lapse；它只用于开发环境的 motion inspection。

## 9. 验证清单

### 启动

- [ ] `npm ci` 无错误
- [ ] `npm run build` 无错误
- [ ] `dist/client/index.html` 存在
- [ ] `npm run preview` 能打开 `/` 和 `/?front=reference`

### 视觉

- [ ] 背景保持橘色 grid，不出现额外黑底或白线
- [ ] 机身、读取舱、磁带和前方面板属于同一套视觉系统
- [ ] 三个磁带能看出不同的艺术化装饰，但仍保持重线稿语言
- [ ] 波形是上下 stereo waveform，不出现被拉成三角或负型的异常形状
- [ ] 前方面板的控件有呼吸空间，不出现文字或按钮碰撞

### 交互

- [ ] 三个磁带都可以选择和插入
- [ ] 释放前不会自动吸入
- [ ] 每盘音频都能播放、暂停、seek、调音量
- [ ] Playhead 与音频时间同步
- [ ] Tone / Space / Texture 的数值与声音变化同步
- [ ] Mark 可以设置 / 清除 / 重新设置
- [ ] Return 可以回到 Mark
- [ ] Eject 不留下旧音频、不留下残影、不穿过盖仓
- [ ] 刷新页面后音频库仍然存在

### 触摸和键盘

- [ ] 主要按钮可用鼠标、键盘和触摸操作
- [ ] slider 有可见 focus 状态
- [ ] knob 支持 pointer drag 和键盘方向键
- [ ] 触摸操作不会被页面滚动或缩放抢走

## 10. 迁移时不要做的事

- 不要把整个项目改成一张背景图片。
- 不要删掉 `public/audio/`。
- 不要把三个磁带替换成普通 audio player。
- 不要把所有控制器烘焙进 canvas，语义控件必须保留。
- 不要重新启用已经废弃的 Inject 命名；当前前方面板使用 Eject。
- 不要在生产页面挂载 Lapse。
- 不要把 token、私有 registry 凭据或本机路径写进 `.env`、`.npmrc` 或提交记录。
- 不要用 `git reset --hard`、`git clean -fd` 或覆盖式 checkout 清理当前工作树。

## 11. 推荐的下一步

新环境先只做“启动和运行时诊断”，不要同时改视觉：

1. 用本 handoff 压缩包建立新的工作目录。
2. `npm ci`。
3. `npm run build`。
4. `npm run preview -- --host 127.0.0.1 --port 4173`。
5. 确认页面是否渲染，再处理 Console 第一条错误。
6. 页面正常后，再按顺序做 Eject 穿膜、波形显示和前方面板 polish。

本文件是当前代码状态的交接说明，不代表所有视觉问题已经完成。它的目的，是让下一个生产环境拥有完整上下文，并把“已验证”和“待确认”分开。
