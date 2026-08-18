import { THINKING_EFFORTS } from "@oh-my-pi/pi-ai";
import { DEFAULT_SHARE_URL } from "@oh-my-pi/pi-wire";
import { SHAPE_VARIANT_NAMES } from "@oh-my-pi/snapcompact";
import { DEFAULT_RELAY_URL } from "../collab/protocol";
import { DEFAULT_LIVE_VOICE, LIVE_VOICE_OPTIONS, LIVE_VOICE_VALUES } from "../live/voices";
import { DEFAULT_STT_MODEL_KEY, STT_MODEL_OPTIONS, STT_MODEL_VALUES } from "../stt/models";
import { STT_SUBMIT_TRIGGER_OPTIONS, STT_SUBMIT_TRIGGER_VALUES } from "../stt/submit-trigger";
import { AUTO_THINKING, getConfiguredThinkingLevelMetadata, getThinkingLevelMetadata } from "../thinking";
import {
	TINY_MODEL_DEVICE_DEFAULT,
	TINY_MODEL_DEVICE_SETTING_OPTIONS,
	TINY_MODEL_DEVICE_SETTING_VALUES,
} from "../tiny/device";
import {
	TINY_MODEL_DTYPE_DEFAULT,
	TINY_MODEL_DTYPE_SETTING_OPTIONS,
	TINY_MODEL_DTYPE_SETTING_VALUES,
} from "../tiny/dtype";
import {
	AUTO_THINKING_MODEL_OPTIONS,
	AUTO_THINKING_MODEL_VALUES,
	ONLINE_AUTO_THINKING_MODEL_KEY,
	ONLINE_MEMORY_MODEL_KEY,
	ONLINE_TINY_TITLE_MODEL_KEY,
	TINY_MEMORY_MODEL_OPTIONS,
	TINY_MEMORY_MODEL_VALUES,
	TINY_TITLE_MODEL_OPTIONS,
	TINY_TITLE_MODEL_VALUES,
} from "../tiny/models";
import { IMAGE_PROVIDER_CHOICES, type ImageProvider } from "../tools/image-providers";
import {
	DEFAULT_TTS_LOCAL_MODEL_KEY,
	DEFAULT_TTS_VOICE,
	TTS_LOCAL_MODEL_OPTIONS,
	TTS_LOCAL_MODEL_VALUES,
	TTS_LOCAL_VOICE_OPTIONS,
	TTS_LOCAL_VOICE_VALUES,
} from "../tts/models";
import { EDIT_MODES } from "../utils/edit-mode";
import {
	DEFAULT_WEB_SEARCH_TIMEOUT_SECONDS,
	MAX_WEB_SEARCH_TIMEOUT_SECONDS,
	SEARCH_PROVIDER_CHOICES,
	type SearchProviderId,
} from "../web/search/types";
import {
	SERVICE_TIER_ANTHROPIC_OPTIONS,
	SERVICE_TIER_ANTHROPIC_VALUES,
	SERVICE_TIER_GOOGLE_OPTIONS,
	SERVICE_TIER_GOOGLE_VALUES,
	SERVICE_TIER_INHERIT_OPTIONS,
	SERVICE_TIER_INHERIT_SETTING_VALUES,
	SERVICE_TIER_OPENAI_OPTIONS,
	SERVICE_TIER_OPENAI_VALUES,
} from "./service-tier";

/** Unified settings schema - single source of truth for all settings.
 *
 * Each setting is defined once here with:
 * - Type and default value
 * - Optional UI metadata (label, description, tab, group)
 *
 * UI metadata places the setting in the settings panel: `tab` picks the
 * panel tab, `group` the titled section within it (registered in
 * TAB_GROUPS). Sections render in TAB_GROUPS order; settings within a
 * section keep declaration order.
 *
 * The Settings singleton provides type-safe path-based access:
 *   settings.get("compaction.enabled")  // => boolean
 *   settings.set("theme.dark", "titanium")  // sync, saves in background
 */

// ═══════════════════════════════════════════════════════════════════════════
// Schema Definition Types
// ═══════════════════════════════════════════════════════════════════════════

export type ModelRoleStorage = "global" | "project";

export type SettingTab =
	| "appearance"
	| "model"
	| "interaction"
	| "context"
	| "memory"
	| "files"
	| "shell"
	| "tools"
	| "tasks"
	| "providers";

/** Tab display metadata - icon is resolved via theme.symbol() */
export type TabMetadata = { label: string; icon: `tab.${string}` };

/** Ordered list of tabs for UI rendering */
export const SETTING_TABS: SettingTab[] = [
	"appearance",
	"model",
	"interaction",
	"context",
	"memory",
	"files",
	"shell",
	"tools",
	"tasks",
	"providers",
];

/** Tab display metadata - icon is a symbol key from theme.ts (tab.*) */
export const TAB_METADATA: Record<SettingTab, { label: string; icon: `tab.${string}` }> = {
	appearance: { label: "外观", icon: "tab.appearance" },
	model: { label: "模型", icon: "tab.model" },
	interaction: { label: "交互", icon: "tab.interaction" },
	context: { label: "上下文", icon: "tab.context" },
	memory: { label: "记忆", icon: "tab.memory" },
	files: { label: "文件", icon: "tab.files" },
	shell: { label: "Shell", icon: "tab.shell" },
	tools: { label: "工具", icon: "tab.tools" },
	tasks: { label: "任务", icon: "tab.tasks" },
	providers: { label: "提供商", icon: "tab.providers" },
};

/**
 * Ordered section groups per tab. Settings declare their section via `ui.group`;
 * the settings UI renders groups in this order with a heading row between them.
 * Ungrouped settings render first, before any section heading.
 */
export const TAB_GROUPS: Record<SettingTab, readonly string[]> = {
	appearance: ["主题", "状态栏", "显示", "图片"],
	model: ["思考", "采样", "提示词", "重试与回退", "顾问", "预扫描", "视觉"],
	interaction: [
		"输入",
		"审批",
		"通知",
		"语音",
		"协作",
		"魔法关键词",
		"启动与更新",
		"电源 (macOS)",
		"代理",
		"Git",
	],
	context: ["常规", "压缩", "规则 (TTSR)", "实验"],
	memory: ["常规", "自动学习", "Mnemopi", "回溯"],
	files: ["编辑", "阅读", "阅读摘要", "LSP"],
	shell: ["Bash", "Eval 与运行时"],
	tools: [
		"可用工具",
		"待办事项",
		"Grep 与浏览器",
		"计算机",
		"GitHub",
		"输出限制",
		"执行",
		"发现与 MCP",
		"扩展",
		"开发者",
	],
	tasks: ["模式", "子代理", "隔离", "命令与技能"],
	providers: ["服务", "Fireworks", "微型模型", "协议", "超时", "隐私"],
};

/** Status line segment identifiers */
export type StatusLineSegmentId =
	| "pi"
	| "model"
	| "mode"
	| "path"
	| "git"
	| "pr"
	| "subagents"
	| "token_in"
	| "token_out"
	| "token_total"
	| "token_rate"
	| "cost"
	| "context_pct"
	| "context_total"
	| "time_spent"
	| "time"
	| "session"
	| "hostname"
	| "cache_read"
	| "cache_write"
	| "cache_hit"
	| "session_name"
	| "usage"
	| "collab";

/** Submenu choice metadata. */
export type SubmenuOption<V extends string = string> = {
	value: V;
	label: string;
	description?: string;
};

interface UiBase {
	tab: SettingTab;
	/** Section within the tab; must be listed in TAB_GROUPS[tab]. Ungrouped settings render at the top. */
	group?: string;
	label: string;
	description: string;
	/** Condition function name - setting only shown when true */
	condition?: string;
}

interface UiBoolean extends UiBase {}

interface UiEnum<T extends readonly string[]> extends UiBase {
	/** Submenu options. When omitted, the enum renders as an inline toggle derived from `values`. */
	options?: ReadonlyArray<SubmenuOption<T[number]>>;
}

interface UiNumber extends UiBase {
	/** Submenu options. Without options, a numeric setting has no UI representation (intentional hide). */
	options?: ReadonlyArray<SubmenuOption>;
}

interface UiString extends UiBase {
	/** Mask the value in both the settings row and text editor. */
	secret?: boolean;
	/**
	 * Submenu options.
	 *  - Array  → submenu with these choices.
	 *  - "runtime" → submenu populated by the runtime layer (theme registry, etc.).
	 *  - Omitted → renders as a free text input.
	 */
	options?: ReadonlyArray<SubmenuOption> | "runtime";
}

interface UiArray extends UiBase {
	/** Membership choices. Without options, an array setting has no UI representation (config-file only). */
	options?: ReadonlyArray<SubmenuOption>;
	/** Selection order is meaningful; the editor renders positions and supports reordering. */
	ordered?: boolean;
}

/** Wide ui shape exposed to consumers that walk the schema generically. */
export type AnyUiMetadata = UiBase & {
	options?: ReadonlyArray<SubmenuOption> | "runtime";
	secret?: boolean;
	ordered?: boolean;
};

/**
 * Marks a setting whose value is a credential.
 *
 * Lives at the top level rather than inside `ui` so it can also describe a
 * setting the settings panel never shows and therefore cannot carry
 * `ui.secret`. Read it through `isCredential`, which is the single accessor
 * both the CLI and the settings panel consult.
 */
interface CredentialMarker {
	credential?: true;
}

interface BooleanDef extends CredentialMarker {
	type: "boolean";
	default: boolean | undefined;
	ui?: UiBoolean;
}

interface StringDef extends CredentialMarker {
	type: "string";
	default: string | undefined;
	ui?: UiString;
}

interface NumberDef extends CredentialMarker {
	type: "number";
	default: number | undefined;
	ui?: UiNumber;
}

interface EnumDef<T extends readonly string[]> extends CredentialMarker {
	type: "enum";
	values: T;
	default: T[number];
	ui?: UiEnum<T>;
}

interface ArrayDef<T> extends CredentialMarker {
	type: "array";
	default: T[];
	ui?: UiArray;
}

interface RecordDef<T> extends CredentialMarker {
	type: "record";
	default: Record<string, T>;
	ui?: UiBase;
}

type SettingDef =
	| BooleanDef
	| StringDef
	| NumberDef
	| EnumDef<readonly string[]>
	| ArrayDef<unknown>
	| RecordDef<unknown>;

// ═══════════════════════════════════════════════════════════════════════════
// Schema Definition
// ═══════════════════════════════════════════════════════════════════════════

export interface ModelTagDef {
	name: string;
	color?: string;
	/** If true, the role is functional but not shown in the model selector UI. */
	hidden?: boolean;
}

export interface ModelTagsSettings {
	[key: string]: ModelTagDef;
}

// Typed defaults for array/record settings — named constants avoid `as` casts
// under `as const` while still letting SettingValue infer the correct element type.
const EMPTY_STRING_ARRAY: string[] = [];
const EMPTY_STRING_RECORD: Record<string, string> = {};
const EMPTY_NUMBER_RECORD: Record<string, number> = {};
const DEFAULT_CYCLE_ORDER: string[] = ["smol", "default", "slow"];
const DEFAULT_TOOL_CALL_LOOP_EXEMPT_TOOLS: string[] = ["hub"];
const EMPTY_MODEL_TAGS_RECORD: ModelTagsSettings = {};
const HINDSIGHT_RECALL_TYPES_DEFAULT: string[] = ["world", "experience"];
export const DEFAULT_BASH_INTERCEPTOR_RULES: BashInterceptorRule[] = [
	{
		pattern: "^\\s*(cat|head|tail|less|more)\\s+",
		tool: "read",
		message: "Use the `read` tool instead of cat/head/tail. It provides better context and handles binary files.",
	},
	{
		pattern: "^\\s*(grep|rg|ripgrep|ag|ack)\\s+",
		tool: "grep",
		message: "Use the `grep` tool instead of grep/rg. It respects .gitignore and provides structured output.",
	},
	{
		pattern: "^\\s*(find|fd|locate)\\s+.*(-name|-iname|-type|--type|-glob)",
		tool: "glob",
		message: "Use the `glob` tool instead of find/fd. It respects .gitignore and is faster for glob patterns.",
	},
	{
		pattern: "^\\s*sed\\s+(-i|--in-place)",
		tool: "edit",
		message: "Use the `edit` tool instead of sed -i. It provides diff preview and fuzzy matching.",
	},
	{
		pattern: "^\\s*perl\\s+.*-[pn]?i",
		tool: "edit",
		message: "Use the `edit` tool instead of perl -i. It provides diff preview and fuzzy matching.",
	},
	{
		pattern: "^\\s*awk\\s+.*-i\\s+inplace",
		tool: "edit",
		message: "Use the `edit` tool instead of awk -i inplace. It provides diff preview and fuzzy matching.",
	},
	{
		// `>` must sit outside quoted regions (so `echo "a -> b"` passes) and be
		// followed by a plausible filename — including `$VAR` targets; `>|`
		// (clobber) counts as a redirect; `>&2`/`2>&1` style fd duplication is
		// not matched. Allowed device sinks are consumed while looking for later
		// real file redirects because the write tool cannot replace shell
		// output/discard targets.
		pattern:
			"^\\s*(echo|printf|cat\\s*<<)\\s+(?:(?:[^\"'>]|\"[^\"]*\"|'[^']*')|(?<!\\|)>{1,2}\\|?\\s*(?:\"/dev/(?:null|tty|stdout|stderr)\"|'/dev/(?:null|tty|stdout|stderr)'|/dev/(?:null|tty|stdout|stderr))(?:[\\s;&|]|$))*(?<!\\|)>{1,2}\\|?\\s*(?!(?:\"/dev/(?:null|tty|stdout|stderr)\"|'/dev/(?:null|tty|stdout|stderr)'|/dev/(?:null|tty|stdout|stderr))(?:[\\s;&|]|$))[$\\w./~\"'-]",
		tool: "write",
		message: "Use the `write` tool instead of echo/cat redirection. It handles encoding and provides confirmation.",
	},
	{
		pattern: "^\\s*nohup\\s+|(?<!&)\\&\\s*$",
		tool: "hub",
		message:
			'Use the `hub` tool (`op:"start"`) instead of nohup or background shell syntax so the process stays observable and managed.',
	},
	{
		pattern:
			"^\\s*(?:(?:bun|npm|pnpm|yarn)\\s+(?:run\\s+)?(?:dev|start)(?:\\s|$)|(?:vite|next\\s+dev|nuxt\\s+dev|nodemon|lldb|gdb|tail\\s+-f)(?:\\s|$)|docker\\s+compose\\s+up(?!.*(?:\\s-d(?:\\s|$)|--detach))(?:\\s|$))",
		tool: "hub",
		message:
			'Use the `hub` tool (`op:"start"`) for services, watchers, and debuggers so other omp instances can observe and control them.',
	},
	{
		pattern:
			"^\\s*(?:(?:bun|npm|pnpm|yarn)\\s+(?:run\\s+)?\\S+|cargo\\s+watch|watchexec|pytest|vitest|jest|tsc)(?:.|\\n)*(?:--watch|-w)(?:\\s|$)",
		tool: "hub",
		message: 'Use the `hub` tool (`op:"start"`) for watch mode so its output, input, and lifecycle stay managed.',
	},
];

const DEFAULT_AGENT_MODEL_OVERRIDES: Record<string, string | string[]> = {};

export const SETTINGS_SCHEMA = {
	// ────────────────────────────────────────────────────────────────────────
	// General settings (no UI)
	// ────────────────────────────────────────────────────────────────────────
	setupVersion: { type: "number", default: 0 },

	// Auth broker — credentials proxied through a remote `omp auth-broker serve`
	// host. Hidden from the UI; populate via env vars or hand-edited config.yml.
	// Env (`OMP_AUTH_BROKER_URL` / `OMP_AUTH_BROKER_TOKEN`) takes precedence so
	// per-machine overrides remain trivial.
	"auth.broker.url": { type: "string", default: undefined },
	"auth.broker.token": { type: "string", default: undefined, credential: true },

	autoResume: {
		type: "boolean",
		default: false,
		ui: {
			tab: "interaction",
			group: "启动与更新",
			label: "自动恢复",
			description: "自动恢复当前目录中最近的会话",
		},
	},

	// macOS power assertions (caffeinate flags). No-op on other platforms.
	"power.sleepPrevention": {
		type: "enum",
		values: ["off", "idle", "display", "system"] as const,
		default: "idle",
		ui: {
			tab: "interaction",
			group: "电源 (macOS)",
			label: "防睡眠",
			description:
				"在活跃会话期间阻止 macOS 睡眠。各级别是累积的——它会添加所有较低级别的标志。",
			options: [
				{
					value: "off",
					label: "关闭",
					description: "不阻止任何睡眠",
				},
				{
					value: "idle",
					label: "阻止空闲睡眠",
					description: "会话打开期间保持系统唤醒 (caffeinate -i)",
				},
				{
					value: "display",
					label: "阻止显示器睡眠",
					description: "同时阻止显示器空闲睡眠 (caffeinate -i -d)",
				},
				{
					value: "system",
					label: "阻止系统睡眠",
					description: "同时在交流电源下阻止所有系统睡眠并声明用户处于活跃状态 (caffeinate -i -d -s -u)",
				},
			],
		},
	},
	"advisor.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "model",
			group: "顾问",
			label: "启用顾问",
			description:
				"搭配一个第二模型（分配给 'advisor' 角色），被动审查每一轮并注入备注。",
		},
	},
	"prewalk.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "model",
			group: "预扫描",
			label: "启用预扫描",
			description:
				"先使用活跃模型开始，然后在计划提示的待办列表出现后的第一次编辑/写入时切换到快速/廉价模型（默认 'smol' 角色）——强模型负责规划、提交待办并开始实现，随后交棒。可在会话中用 --prewalk / --no-prewalk 覆盖。",
		},
	},
	"advisor.syncBacklog": {
		type: "enum",
		values: ["off", "1", "3", "5"] as const,
		default: "off",
		ui: {
			tab: "model",
			group: "顾问",
			label: "顾问同步积压",
			description:
				"当顾问落后于此轮数时，暂停主代理最多 30 秒。关闭可禁用追赶延迟。",
			condition: "advisorEnabled",
		},
	},
	"advisor.immuneTurns": {
		type: "number",
		default: 3,
		ui: {
			tab: "model",
			group: "顾问",
			label: "顾问豁免轮数",
			description:
				"在顾问的关注点或阻塞中断之后，后续的关注点/阻塞将在此主代理轮数内以非中断方式路由。",
			options: [
				{ value: "0", label: "0 轮", description: "允许每个关注点/阻塞都中断。" },
				{ value: "1", label: "1 轮" },
				{ value: "2", label: "2 轮" },
				{ value: "3", label: "3 轮", description: "默认。" },
				{ value: "4", label: "4 轮" },
				{ value: "5", label: "5 轮" },
			],
			condition: "advisorEnabled",
		},
	},
	shellPath: { type: "string", default: undefined },
	"git.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "interaction",
			group: "Git",
			label: "启用 Git 集成",
			description: "在 TUI 中显示 git 分支、状态和 PR 信息，并监视仓库元数据。",
		},
	},

	extensions: { type: "array", default: EMPTY_STRING_ARRAY },

	enabledModels: { type: "array", default: EMPTY_STRING_ARRAY },

	disabledProviders: { type: "array", default: EMPTY_STRING_ARRAY },

	"providers.maxInFlightRequests": {
		type: "record",
		default: EMPTY_NUMBER_RECORD,
		ui: {
			tab: "providers",
			group: "服务",
			label: "最大并发请求数",
			description:
				"每个提供商 id（例如 \"openai\" 或 \"anthropic\"）的最大并发 LLM 请求数，在此配置根目录下的本地 OMP 进程间共享。未列出的提供商不受限制。",
		},
	},

	disabledExtensions: { type: "array", default: EMPTY_STRING_ARRAY },

	modelRoleStorage: {
		type: "enum",
		values: ["global", "project"] as const,
		default: "global",
		ui: {
			tab: "model",
			group: "提示词",
			label: "模型角色存储位置",
			description: "模型选择器的角色分配保存在哪里",
			options: [
				{
					value: "global",
					label: "全局",
					description: "将角色模型保存在当前配置文件（当前行为）",
				},
				{
					value: "project",
					label: "按项目",
					description: "将项目角色模型保存在 .omp/config.yml；缺失的项目角色使用全局默认值",
				},
			],
		},
	},

	modelRoles: { type: "record", default: EMPTY_STRING_RECORD },

	modelTags: { type: "record", default: EMPTY_MODEL_TAGS_RECORD },

	modelProviderOrder: { type: "array", default: EMPTY_STRING_ARRAY },

	cycleOrder: { type: "array", default: DEFAULT_CYCLE_ORDER },

	// ────────────────────────────────────────────────────────────────────────
	// Appearance
	// ────────────────────────────────────────────────────────────────────────

	// Theme
	"theme.dark": {
		type: "string",
		default: "titanium",
		ui: {
			tab: "appearance",
			group: "主题",
			label: "暗色主题",
			description: "终端为深色背景时使用的主题",
			options: "runtime",
		},
	},

	"theme.light": {
		type: "string",
		default: "light",
		ui: {
			tab: "appearance",
			group: "主题",
			label: "亮色主题",
			description: "终端为浅色背景时使用的主题",
			options: "runtime",
		},
	},

	symbolPreset: {
		type: "enum",
		values: ["unicode", "nerd", "ascii"] as const,
		default: "unicode",
		ui: {
			tab: "appearance",
			group: "主题",
			label: "符号预设",
			description: "图标和符号使用的字形集（Unicode、Nerd Font 或 ASCII）",
			options: [
				{ value: "unicode", label: "Unicode", description: "标准符号（默认）" },
				{ value: "nerd", label: "Nerd Font", description: "需要 Nerd Font" },
				{ value: "ascii", label: "ASCII", description: "最大兼容性" },
			],
		},
	},

	colorBlindMode: {
		type: "boolean",
		default: false,
		ui: {
			tab: "appearance",
			group: "主题",
			label: "色盲模式",
			description: "diff 新增内容使用蓝色而非绿色",
		},
	},

	// Status line
	"statusLine.preset": {
		type: "enum",
		values: ["default", "minimal", "compact", "full", "nerd", "ascii", "custom"] as const,
		default: "default",
		ui: {
			tab: "appearance",
			group: "状态栏",
			label: "状态栏预设",
			description: "预构建的状态栏配置",
			options: [
				{ value: "default", label: "默认", description: "模型、路径、git、上下文、令牌、费用" },
				{ value: "minimal", label: "极简", description: "仅路径和 git" },
				{ value: "compact", label: "紧凑", description: "模型、git、费用、上下文" },
				{ value: "full", label: "完整", description: "包括时间在内的所有分段" },
				{ value: "nerd", label: "Nerd", description: "使用 Nerd Font 图标的最大信息量" },
				{ value: "ascii", label: "ASCII", description: "无特殊字符" },
				{ value: "custom", label: "自定义", description: "用户自定义分段" },
			],
		},
	},

	"statusLine.separator": {
		type: "enum",
		values: ["powerline", "powerline-thin", "slash", "pipe", "block", "none", "ascii"] as const,
		default: "powerline-thin",
		ui: {
			tab: "appearance",
			group: "状态栏",
			label: "状态栏分隔符",
			description: "各分段之间的分隔符样式",
			options: [
				{ value: "powerline", label: "Powerline", description: "实心箭头 (Nerd Font)" },
				{ value: "powerline-thin", label: "细箭头", description: "细箭头 (Nerd Font)" },
				{ value: "slash", label: "斜线", description: "正斜杠" },
				{ value: "pipe", label: "竖线", description: "垂直管道" },
				{ value: "block", label: "方块", description: "实心块" },
				{ value: "none", label: "无", description: "仅空格" },
				{ value: "ascii", label: "ASCII", description: "大于号" },
			],
		},
	},

	"statusLine.sessionAccent": {
		type: "boolean",
		default: true,
		ui: {
			tab: "appearance",
			group: "状态栏",
			label: "会话强调色",
			description: "编辑器边框和状态栏间隙使用会话名称颜色",
		},
	},

	"statusLine.transparent": {
		type: "boolean",
		default: false,
		ui: {
			tab: "appearance",
			group: "状态栏",
			label: "透明状态栏",
			description:
				"状态栏使用终端的默认背景，而非主题的 `statusLineBg`。Powerline 端帽会被移除，因为它们需要有对比度的填充来衔接周围的终端。",
		},
	},
	"statusLine.compactThinkingLevel": {
		type: "boolean",
		default: false,
		ui: {
			tab: "appearance",
			group: "状态栏",
			label: "紧凑思考级别",
			description:
				"将思考级别显示为模型名上的单个图标，而非单独的 ` · <level>` 后缀。",
		},
	},
	"tools.artifactSpillThreshold": {
		type: "number",
		default: 50,
		ui: {
			tab: "tools",
			group: "输出限制",
			label: "产物转储阈值 (KB)",
			description: "超过此大小的工具输出将保存为产物；末尾部分保留在行内",
			options: [
				{ value: "1", label: "1 KB", description: "约 250 个令牌" },
				{ value: "2.5", label: "2.5 KB", description: "约 625 个令牌" },
				{ value: "5", label: "5 KB", description: "约 1.25K 个令牌" },
				{ value: "10", label: "10 KB", description: "约 2.5K 个令牌" },
				{ value: "20", label: "20 KB", description: "约 5K 个令牌" },
				{ value: "30", label: "30 KB", description: "约 7.5K 个令牌" },
				{ value: "50", label: "50 KB", description: "默认；约 12.5K 个令牌" },
				{ value: "75", label: "75 KB", description: "约 19K 个令牌" },
				{ value: "100", label: "100 KB", description: "约 25K 个令牌" },
				{ value: "200", label: "200 KB", description: "约 50K 个令牌" },
				{ value: "500", label: "500 KB", description: "约 125K 个令牌" },
				{ value: "1000", label: "1 MB", description: "约 250K 个令牌" },
			],
		},
	},
	"tools.artifactTailBytes": {
		type: "number",
		default: 20,
		ui: {
			tab: "tools",
			group: "输出限制",
			label: "产物末尾保留大小 (KB)",
			description: "输出转储到产物时保留在行内的末尾内容量",
			options: [
				{ value: "1", label: "1 KB", description: "约 250 个令牌" },
				{ value: "2.5", label: "2.5 KB", description: "约 625 个令牌" },
				{ value: "5", label: "5 KB", description: "约 1.25K 个令牌" },
				{ value: "10", label: "10 KB", description: "约 2.5K 个令牌" },
				{ value: "20", label: "20 KB", description: "默认；约 5K 个令牌" },
				{ value: "50", label: "50 KB", description: "约 12.5K 个令牌" },
				{ value: "100", label: "100 KB", description: "约 25K 个令牌" },
				{ value: "200", label: "200 KB", description: "约 50K 个令牌" },
			],
		},
	},
	"tools.artifactHeadBytes": {
		type: "number",
		default: 20,
		ui: {
			tab: "tools",
			group: "输出限制",
			label: "产物开头保留大小 (KB)",
			description:
				"输出转储到产物时，与末尾一同保留在行内的开头内容量（省略中间部分）。0 禁用——仅保留末尾。",
			options: [
				{ value: "0", label: "0 KB", description: "禁用；仅末尾截断" },
				{ value: "1", label: "1 KB", description: "约 250 个令牌" },
				{ value: "2.5", label: "2.5 KB", description: "约 625 个令牌" },
				{ value: "5", label: "5 KB", description: "约 1.25K 个令牌" },
				{ value: "10", label: "10 KB", description: "约 2.5K 个令牌" },
				{ value: "20", label: "20 KB", description: "默认；约 5K 个令牌" },
				{ value: "50", label: "50 KB", description: "约 12.5K 个令牌" },
				{ value: "100", label: "100 KB", description: "约 25K 个令牌" },
				{ value: "200", label: "200 KB", description: "约 50K 个令牌" },
			],
		},
	},
	"tools.outputMaxColumns": {
		type: "number",
		default: 768,
		ui: {
			tab: "tools",
			group: "输出限制",
			label: "输出列数上限",
			description:
				"流式工具输出（bash、python、js eval）和 `read` 的每行字节上限。超过此宽度的行以省略号截断；到下一个换行符为止的剩余字节被丢弃。0 禁用。",
			options: [
				{ value: "0", label: "关闭", description: "无每行上限" },
				{ value: "256", label: "256", description: "紧凑" },
				{ value: "512", label: "512" },
				{ value: "768", label: "768", description: "默认" },
				{ value: "1024", label: "1024" },
				{ value: "2048", label: "2048" },
				{ value: "4096", label: "4096", description: "宽松" },
			],
		},
	},
	"tools.artifactTailLines": {
		type: "number",
		default: 500,
		ui: {
			tab: "tools",
			group: "输出限制",
			label: "产物末尾行数",
			description: "输出转储到产物时保留在行内的末尾内容最大行数",
			options: [
				{ value: "50", label: "50 行", description: "约 250 个令牌" },
				{ value: "100", label: "100 行", description: "约 500 个令牌" },
				{ value: "250", label: "250 行", description: "约 1.25K 个令牌" },
				{ value: "500", label: "500 行", description: "默认；约 2.5K 个令牌" },
				{ value: "1000", label: "1000 行", description: "约 5K 个令牌" },
				{ value: "2000", label: "2000 行", description: "约 10K 个令牌" },
				{ value: "5000", label: "5000 行", description: "约 25K 个令牌" },
			],
		},
	},

	"statusLine.showHookStatus": {
		type: "boolean",
		default: true,
		ui: {
			tab: "appearance",
			group: "状态栏",
			label: "显示钩子状态",
			description: "在状态栏下方显示钩子状态消息",
		},
	},

	"statusLine.leftSegments": { type: "array", default: [] as StatusLineSegmentId[] },

	"statusLine.rightSegments": { type: "array", default: [] as StatusLineSegmentId[] },

	"statusLine.segmentOptions": { type: "record", default: {} as Record<string, unknown> },

	// Images and terminal
	"terminal.showImages": {
		type: "boolean",
		default: true,
		ui: {
			tab: "appearance",
			group: "图片",
			label: "显示内联图片",
			description: "在终端中内联渲染图片",
			condition: "hasImageProtocol",
		},
	},

	"images.autoResize": {
		type: "boolean",
		default: true,
		ui: {
			tab: "appearance",
			group: "图片",
			label: "图片自动缩放",
			description: "将大图缩放到最大 2000x2000 以获得更好的模型兼容性",
		},
	},

	"images.blockImages": {
		type: "boolean",
		default: false,
		ui: {
			tab: "appearance",
			group: "图片",
			label: "阻止图片",
			description: "阻止图片发送给 LLM 提供商",
		},
	},

	"images.describeForTextModels": {
		type: "boolean",
		default: true,
		ui: {
			tab: "model",
			group: "视觉",
			label: "为文本模型描述图片",
			description:
				"当图片附加到不支持视觉的模型时，将其保存在 local:// 下，并从具备视觉能力的模型注入描述，而不是丢弃它",
		},
	},

	"tui.maxInlineImageColumns": {
		type: "number",
		default: 100,
		description:
			"内联图像在终端列中的最大宽度（默认100）。设置为0表示无限制（仅受终端宽度限制）。",
	},

	"tui.maxInlineImageRows": {
		type: "number",
		default: 20,
		description:
			"内联图像在终端行中的最大高度（默认20）。设置为0时仅使用基于视口的限制（终端高度的60%）。",
	},

	"tui.maxInlineImages": {
		type: "number",
		default: 8,
		description:
			"作为活动终端图形保留的内联图像最大数量（默认8）。超过限制后，较旧的图像通过完全重绘回退为文本占位符。设置为0则保留所有图像（无限制）。",
	},

	"terminal.showProgress": {
		type: "boolean",
		default: false,
		ui: {
			tab: "appearance",
			group: "显示",
			label: "原生终端进度",
			description: "在代理或上下文维护运行时发出 OSC 9;4 不定进度",
		},
	},

	"tui.textSizing": {
		type: "boolean",
		default: false,
		ui: {
			tab: "appearance",
			group: "显示",
			label: "大标题 (Kitty)",
			description:
				"使用 Kitty 的 OSC 66 文本缩放协议以 2 倍比例渲染 Markdown H1 标题。仅在 Kitty 终端上生效；其他环境忽略。默认关闭。",
		},
	},

	"tui.renderMermaid": {
		type: "boolean",
		default: true,
		ui: {
			tab: "appearance",
			group: "显示",
			label: "渲染 Mermaid 图表",
			description: "将 Mermaid 围栏代码块渲染为 ASCII 图表",
		},
	},

	"tui.codexResetFireworks": {
		type: "boolean",
		default: false,
		ui: {
			tab: "appearance",
			group: "显示",
			label: "Codex 重置烟花",
			description:
				"用占据顶部三分之一、直至按 Escape 才消失的烟花覆盖层来庆祝计划外的 Codex 每周用量重置和新累积的已保存重置",
		},
	},

	"tui.titleState": {
		type: "boolean",
		default: true,
		ui: {
			tab: "appearance",
			group: "显示",
			label: "终端标题运行状态",
			description:
				"在终端标题的分隔符中显示代理运行状态——工作时为动画旋转器（Windows 上为静态 ':'），轮到你时显示 '>'，代理等待你时显示 '!'",
		},
	},

	"tui.hyperlinks": {
		type: "enum",
		values: ["off", "auto", "always"] as const,
		default: "auto",
		ui: {
			tab: "appearance",
			group: "显示",
			label: "终端超链接",
			description:
				"将路径和 URL 包装在 OSC 8 超链接中以支持终端原生点击打开（auto：检测支持；off：从不；always：无条件）",
		},
	},
	"tui.tight": {
		type: "boolean",
		default: false,
		ui: {
			tab: "appearance",
			group: "显示",
			label: "紧凑布局",
			description: "移除终端输出左右两侧各 1 字符的水平内边距",
		},
	},
	"tui.scrollbackRebuild": {
		type: "boolean",
		default: false,
		ui: {
			tab: "appearance",
			group: "显示",
			label: "重写回滚缓冲区",
			description:
				"当块的最终形式取代其实时预览时，擦除并重放终端回滚缓冲区。关闭（默认）时，过期的预览副本保留在历史中，最终内容追加在下方。",
		},
	},

	"display.shimmer": {
		type: "enum",
		values: ["classic", "kitt", "disabled"] as const,
		default: "classic",
		ui: {
			tab: "appearance",
			group: "显示",
			label: "微光动画",
			description: "工作/加载消息的动画样式",
			options: [
				{ value: "classic", label: "经典", description: "柔和余弦波扫过文本" },
				{ value: "kitt", label: "KITT 扫描", description: "Knight Rider 1982 红点左右弹跳" },
				{ value: "disabled", label: "禁用", description: "无动画；静态弱化文本" },
			],
		},
	},

	"display.smoothStreaming": {
		type: "boolean",
		default: true,
		ui: {
			tab: "appearance",
			group: "显示",
			label: "平滑流式显示",
			description: "在分块到达时平滑地显示助手文本和流式工具输入",
		},
	},

	"display.hideToolActivity": {
		type: "boolean",
		default: false,
		ui: {
			tab: "appearance",
			group: "显示",
			label: "隐藏工具活动",
			description: "从记录中隐藏模型发起的工具调用和结果",
		},
	},

	"display.showTokenUsage": {
		type: "boolean",
		default: false,
		ui: {
			tab: "appearance",
			group: "显示",
			label: "显示令牌用量",
			description: "在助手消息上显示每轮令牌用量",
		},
	},

	"display.cacheMissMarker": {
		type: "boolean",
		default: false,
		ui: {
			tab: "appearance",
			group: "显示",
			label: "缓存未命中标记",
			description: "在请求未命中（错过）提示缓存的助手轮次上方显示分隔线",
		},
	},

	"display.collapseCompacted": {
		type: "boolean",
		default: true,
		ui: {
			tab: "appearance",
			group: "显示",
			label: "折叠压缩后的历史",
			description:
				"在实时记录中把压缩前的历史折叠到摘要分隔线之后；禁用则保留完整记录，并在每个压缩点显示分隔线",
		},
	},

	showHardwareCursor: {
		type: "boolean",
		default: true, // will be computed based on platform if undefined
		ui: {
			tab: "appearance",
			group: "显示",
			label: "显示硬件光标",
			description: "显示终端光标以支持 IME",
		},
	},

	"tui.imeSafeCursor": {
		type: "boolean",
		default: false,
		ui: {
			tab: "appearance",
			group: "显示",
			label: "IME 安全提示布局",
			description: "将提示的底部边框移到单独一行，以免 macOS IME 预编辑内容将其挤走",
		},
	},

	// ────────────────────────────────────────────────────────────────────────
	// Model
	// ────────────────────────────────────────────────────────────────────────

	// Reasoning and prompts
	defaultThinkingLevel: {
		type: "enum",
		values: [...THINKING_EFFORTS, AUTO_THINKING],
		default: "high",
		ui: {
			tab: "model",
			group: "思考",
			label: "思考级别",
			description: "支持思考的模型的推理深度",
			options: [
				getConfiguredThinkingLevelMetadata(AUTO_THINKING),
				...THINKING_EFFORTS.map(getThinkingLevelMetadata),
			],
		},
	},

	hideThinkingBlock: {
		type: "boolean",
		default: false,
		ui: {
			tab: "model",
			group: "思考",
			label: "隐藏思考块",
			description: "隐藏助手回复中的思考块",
		},
	},
	proseOnlyThinking: {
		type: "boolean",
		default: true,
		ui: {
			tab: "model",
			group: "思考",
			label: "纯文本思考",
			description: "从思考摘要中省略代码块，并用省略号替换",
		},
	},

	omitThinking: {
		type: "boolean",
		default: false,
		ui: {
			tab: "model",
			group: "思考",
			label: "省略思考摘要",
			description:
				"指示上游提供商完全省略回复中的思考摘要（在支持的情况下）",
		},
	},

	externalThinking: {
		type: "boolean",
		default: false,
		ui: {
			tab: "model",
			group: "思考",
			label: "外部思考",
			description: "私有草稿区；不向用户显示。禁用受支持的 GPT、Claude 和 Gemini 推理",
		},
	},

	"model.loopGuard.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "model",
			group: "思考",
			label: "循环防护",
			description: "为模型推理和正文启用自动流循环检测",
		},
	},

	"model.loopGuard.checkAssistantContent": {
		type: "boolean",
		default: true,
		ui: {
			tab: "model",
			group: "思考",
			label: "循环防护扫描正文",
			description: "除了思考日志外，还对助手正文消息应用循环防护",
		},
	},

	"model.loopGuard.toolCallReminder": {
		type: "boolean",
		default: true,
		ui: {
			tab: "model",
			group: "思考",
			label: "循环防护工具调用提醒",
			description:
				"当 Gemini 推理流连续发出多个规划头但不调用工具时，中断它并注入一条提醒以发起工具调用（需要循环防护）",
		},
	},

	"model.toolCallLoopGuard.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "model",
			group: "思考",
			label: "工具调用循环防护",
			description: "检测跨轮次连续相同的工具调用并注入纠正性引导",
		},
	},

	"model.toolCallLoopGuard.threshold": {
		type: "number",
		default: 5,
		ui: {
			tab: "model",
			group: "思考",
			label: "工具调用循环阈值",
			description: "注入纠正性引导前所需的连续相同工具调用次数",
		},
	},

	"model.toolCallLoopGuard.exemptTools": {
		type: "array",
		default: DEFAULT_TOOL_CALL_LOOP_EXEMPT_TOOLS,
		ui: {
			tab: "model",
			group: "思考",
			label: "工具调用循环豁免工具",
			description: "允许连续重复而不会触发跨轮次循环防护的工具名称",
		},
	},

	inlineToolDescriptors: {
		type: "enum",
		values: ["auto", "on", "off"] as const,
		default: "auto",
		ui: {
			tab: "model",
			group: "提示词",
			label: "内联工具描述",
			description:
				"在系统提示中渲染完整的工具描述，并从提供商工具模式中剥离顶层/嵌套描述，使描述文本只发送一次。Auto 对 Gemini 模型启用此功能，否则禁用",
			options: [
				{
					value: "auto",
					label: "自动",
					description: "为 Gemini 模型内联描述；否则保留在工具模式中",
				},
				{ value: "on", label: "开启", description: "始终在系统提示中内联描述" },
				{ value: "off", label: "关闭", description: "仅在提供商工具模式中保留描述" },
			],
		},
	},

	includeModelInPrompt: {
		type: "boolean",
		default: true,
		ui: {
			tab: "model",
			group: "提示词",
			label: "在提示中包含模型名",
			description: "在系统提示中呈现活跃的模型标识符，使代理知道自己是什么模型",
		},
	},

	includeWorkspaceTree: {
		type: "boolean",
		default: false,
		ui: {
			tab: "model",
			group: "提示词",
			label: "包含工作区目录树",
			description:
				"在系统提示中渲染工作区目录树。警告：文件被修改时这可能破坏跨会话的提示缓存。",
		},
	},

	"workspace.additionalDirectories": {
		type: "array",
		default: [] as string[],
		ui: {
			tab: "context",
			group: "常规",
			label: "额外工作区目录",
			description:
				"作为额外根目录添加到每个会话的工作区目录（多根工作区）。可通过 /add-dir 和 /remove-dir 实时管理。路径相对于 cwd 解析；建议使用绝对路径。代理被告知这些根目录存在，可以读取/grep/glob 它们。",
		},
	},

	personality: {
		type: "enum",
		values: ["default", "friendly", "pragmatic", "none"] as const,
		default: "default",
		ui: {
			tab: "model",
			group: "提示词",
			label: "个性",
			description: "渲染到系统提示个性块中的沟通风格",
			options: [
				{
					value: "default",
					label: "默认",
					description: "简洁、证据优先的工程师；密集、行动导向的回复",
				},
				{
					value: "friendly",
					label: "友好",
					description: "温暖、鼓励的协作者，注重势头和士气",
				},
				{
					value: "pragmatic",
					label: "务实",
					description: "直接、高效的工程师，注重清晰和严谨",
				},
				{ value: "none", label: "无", description: "完全省略个性块" },
			],
		},
	},

	// Sampling
	temperature: {
		type: "number",
		default: -1,
		ui: {
			tab: "model",
			group: "采样",
			label: "温度",
			description: "采样温度（0 = 确定性，1 = 创造性，-1 = 提供商默认）",
			options: [
				{ value: "-1", label: "默认", description: "使用提供商默认值" },
				{ value: "0", label: "0", description: "确定性" },
				{ value: "0.2", label: "0.2", description: "专注" },
				{ value: "0.5", label: "0.5", description: "均衡" },
				{ value: "0.7", label: "0.7", description: "创造性" },
				{ value: "1", label: "1", description: "最大多样性" },
			],
		},
	},

	topP: {
		type: "number",
		default: -1,
		ui: {
			tab: "model",
			group: "采样",
			label: "Top P",
			description: "核采样截断值（0-1，-1 = 提供商默认）",
			options: [
				{ value: "-1", label: "默认", description: "使用提供商默认值" },
				{ value: "0.1", label: "0.1", description: "非常专注" },
				{ value: "0.3", label: "0.3", description: "专注" },
				{ value: "0.5", label: "0.5", description: "均衡" },
				{ value: "0.9", label: "0.9", description: "宽泛" },
				{ value: "1", label: "1", description: "无核过滤" },
			],
		},
	},

	topK: {
		type: "number",
		default: -1,
		ui: {
			tab: "model",
			group: "采样",
			label: "Top K",
			description: "从 Top-K 令牌中采样（-1 = 提供商默认）",
			options: [
				{ value: "-1", label: "默认", description: "使用提供商默认值" },
				{ value: "1", label: "1", description: "贪心取最高令牌" },
				{ value: "20", label: "20", description: "专注" },
				{ value: "40", label: "40", description: "均衡" },
				{ value: "100", label: "100", description: "宽泛" },
			],
		},
	},

	minP: {
		type: "number",
		default: -1,
		ui: {
			tab: "model",
			group: "采样",
			label: "Min P",
			description: "最小概率阈值（0-1，-1 = 提供商默认）",
			options: [
				{ value: "-1", label: "默认", description: "使用提供商默认值" },
				{ value: "0.01", label: "0.01", description: "非常宽松" },
				{ value: "0.05", label: "0.05", description: "均衡" },
				{ value: "0.1", label: "0.1", description: "严格" },
			],
		},
	},

	presencePenalty: {
		type: "number",
		default: -1,
		ui: {
			tab: "model",
			group: "采样",
			label: "存在惩罚",
			description: "对引入已出现令牌的惩罚（-1 = 提供商默认）",
			options: [
				{ value: "-1", label: "默认", description: "使用提供商默认值" },
				{ value: "0", label: "0", description: "无惩罚" },
				{ value: "0.5", label: "0.5", description: "轻度求新" },
				{ value: "1", label: "1", description: "鼓励求新" },
				{ value: "2", label: "2", description: "强力求新" },
			],
		},
	},

	repetitionPenalty: {
		type: "number",
		default: -1,
		ui: {
			tab: "model",
			group: "采样",
			label: "重复惩罚",
			description: "对重复令牌的惩罚（-1 = 提供商默认）",
			options: [
				{ value: "-1", label: "默认", description: "使用提供商默认值" },
				{ value: "0.8", label: "0.8", description: "允许重复" },
				{ value: "1", label: "1", description: "无惩罚" },
				{ value: "1.1", label: "1.1", description: "轻度惩罚" },
				{ value: "1.2", label: "1.2", description: "均衡" },
				{ value: "1.5", label: "1.5", description: "强力惩罚" },
			],
		},
	},

	textVerbosity: {
		type: "enum",
		values: ["low", "medium", "high"] as const,
		default: "medium",
		ui: {
			tab: "model",
			group: "采样",
			label: "文本详略度",
			description: "OpenAI Responses 和 Codex 的回复详略度（低、中或高）",
			options: [
				{ value: "low", label: "低", description: "偏好简洁回复" },
				{ value: "medium", label: "中", description: "在简洁与详细之间平衡（默认）" },
				{ value: "high", label: "高", description: "偏好详细回复" },
			],
		},
	},

	"tier.openai": {
		type: "enum",
		values: SERVICE_TIER_OPENAI_VALUES,
		default: "none",
		ui: {
			tab: "model",
			group: "采样",
			label: "服务层级 — OpenAI",
			description:
				"OpenAI / OpenAI-Codex 请求以及经 OpenRouter 路由的 OpenAI 家族模型的处理层级（none = 省略）。作为 `service_tier` 发送。",
			options: SERVICE_TIER_OPENAI_OPTIONS,
		},
	},

	"tier.anthropic": {
		type: "enum",
		values: SERVICE_TIER_ANTHROPIC_VALUES,
		default: "none",
		ui: {
			tab: "model",
			group: "采样",
			label: "服务层级 — Anthropic",
			description:
				'Claude 请求的处理层级。`priority` 在受支持的直接 Anthropic 模型上实现快速模式（`speed: "fast"`）；在 Bedrock/Vertex Claude 及经 OpenRouter 时被忽略。',
			options: SERVICE_TIER_ANTHROPIC_OPTIONS,
		},
	},

	"tier.google": {
		type: "enum",
		values: SERVICE_TIER_GOOGLE_VALUES,
		default: "none",
		ui: {
			tab: "model",
			group: "采样",
			label: "服务层级 — Google",
			description:
				"Gemini（Google AI Studio + Vertex）请求以及经 OpenRouter 路由的 Google 家族模型的处理层级（none = 省略）。作为顶层 `serviceTier` 字段发送。",
			options: SERVICE_TIER_GOOGLE_OPTIONS,
		},
	},

	"tier.subagent": {
		type: "enum",
		values: SERVICE_TIER_INHERIT_SETTING_VALUES,
		default: "inherit",
		ui: {
			tab: "model",
			group: "采样",
			label: "服务层级 — 子代理",
			description:
				"派生任务/eval 子代理的服务层级。继承 = 匹配主代理的实时按家族层级（跟随 /fast）；选择一个值则将其应用于子代理模型所属的家族。",
			options: SERVICE_TIER_INHERIT_OPTIONS,
		},
	},

	"tier.advisor": {
		type: "enum",
		values: SERVICE_TIER_INHERIT_SETTING_VALUES,
		default: "none",
		ui: {
			tab: "model",
			group: "采样",
			label: "服务层级 — 顾问",
			description:
				"顾问模型的服务层级。无 = 标准处理；继承 = 匹配主代理的实时按家族层级；选择一个值则将其应用于顾问模型所属的家族。",
			options: SERVICE_TIER_INHERIT_OPTIONS,
			condition: "advisorEnabled",
		},
	},

	// Retries
	"retry.enabled": { type: "boolean", default: true },

	"retry.maxRetries": {
		type: "number",
		default: 10,
		ui: {
			tab: "model",
			group: "重试与回退",
			label: "重试次数",
			description: "API 错误时的最大重试次数",
			options: [
				{ value: "1", label: "重试 1 次" },
				{ value: "2", label: "重试 2 次" },
				{ value: "3", label: "重试 3 次" },
				{ value: "5", label: "重试 5 次" },
				{ value: "10", label: "重试 10 次" },
			],
		},
	},

	"retry.baseDelayMs": { type: "number", default: 500 },
	"retry.maxDelayMs": {
		type: "number",
		default: 5 * 60 * 1000,
		ui: {
			tab: "model",
			group: "重试与回退",
			label: "最大重试延迟",
			description:
				"重试之间的最大等待时间，单位毫秒。当提供商要求我们等待超过此时间且没有凭证或模型回退成功时，请求快速失败而不是睡眠（例如 3 小时的 Anthropic 限流窗口）。",
		},
	},
	"retry.modelFallback": {
		type: "boolean",
		default: true,
		ui: {
			tab: "model",
			group: "重试与回退",
			label: "重试模型回退",
			description: "允许重试恢复切换到已配置的回退模型",
		},
	},
	"retry.usageAwareFallback": {
		type: "boolean",
		default: false,
		ui: {
			tab: "model",
			group: "重试与回退",
			label: "用量感知回退",
			description:
				"在达到硬性用量限制之前，使用可靠的编程套餐配额报告优先选择同提供商的账户，然后是已配置的回退模型。普通的已配置 API 密钥被排除在外。",
		},
	},
	"retry.usageReservePct": {
		type: "number",
		default: 10,
		ui: {
			tab: "model",
			group: "重试与回退",
			label: "预留余量",
			description:
				"当编程套餐模型剩余比例低于此值时视为接近上限。未知或未映射的用量保留主模型。",
			condition: "usageAwareFallbackEnabled",
			options: [
				{ value: "5", label: "5%", description: "仅在几乎耗尽时采取行动" },
				{ value: "10", label: "10%", description: "均衡的安全余量" },
				{ value: "15", label: "15%", description: "保守" },
				{ value: "20", label: "20%", description: "提前保护" },
				{ value: "25", label: "25%", description: "非常保守" },
			],
		},
	},
	"retry.usageReservePolicy": {
		type: "enum",
		values: ["confirm", "auto", "fail-closed"] as const,
		default: "confirm",
		ui: {
			tab: "model",
			group: "重试与回退",
			label: "预留策略",
			description: "当所有同提供商的编程套餐账户都处于预留余量内时该怎么做。",
			condition: "usageAwareFallbackEnabled",
			options: [
				{
					value: "confirm",
					label: "交互式确认",
					description: "交互式会话保持主账户直到确认；后台代理自动回退",
				},
				{
					value: "auto",
					label: "自动回退",
					description: "始终选择下一个符合条件的已配置回退",
				},
				{
					value: "fail-closed",
					label: "保守失败",
					description: "不消耗预留配额也不选择回退",
				},
			],
		},
	},
	"retry.fallbackChains": {
		type: "record",
		default: {} as Record<string, string[]>,
		ui: {
			tab: "model",
			group: "重试与回退",
			label: "重试回退链",
			description:
				'将模型角色、模型选择器（"provider/model-id"）或提供商通配符（"provider/*"）映射到有序回退选择器的 JSON 对象，例如 {"default":["openai/gpt-4o-mini"],"google-antigravity/*":["google/*","google-vertex/*"]}。基于模型的键在该模型/提供商活跃时生效，与角色无关；"provider/*" 条目保留失败模型的 id 并替换提供商。带 id 前缀的通配符（"openrouter/google/*"）会重新前缀失败模型的裸 id（google-antigravity/gemini-x -> openrouter/google/gemini-x），并且作为键时只匹配该提供商在该前缀下的 id。',
		},
	},
	"retry.fallbackRevertPolicy": {
		type: "enum",
		values: ["cooldown-expiry", "never"] as const,
		default: "cooldown-expiry",
		ui: {
			tab: "model",
			group: "重试与回退",
			label: "回退恢复策略",
			description: "回退后何时返回主模型",
			options: [
				{
					value: "cooldown-expiry",
					label: "冷却期结束",
					description: "主模型的抑制窗口结束后返回",
				},
				{ value: "never", label: "从不", description: "保持回退模型，直到手动更改" },
			],
		},
	},

	"providers.anthropic.serverSideFallback": {
		type: "boolean",
		default: false,
		ui: {
			tab: "model",
			group: "重试与回退",
			label: "Anthropic 服务端回退 (Fable 5)",
			description:
				"当 Claude Fable 5 / Mythos 5 请求被 Anthropic 的安全分类器阻止时，在 Claude Opus 4.8 服务端重试（Anthropic `server-side-fallback-2026-06-01` beta）。选择加入——保持关闭可对所有请求保留回退前的行为。",
		},
	},

	// ────────────────────────────────────────────────────────────────────────
	// Interaction
	// ────────────────────────────────────────────────────────────────────────

	// Conversation flow
	steeringMode: {
		type: "enum",
		values: ["all", "one-at-a-time"] as const,
		default: "one-at-a-time",
		ui: {
			tab: "interaction",
			group: "输入",
			label: "引导模式",
			description: "代理工作时如何处理排队的消息",
		},
	},

	followUpMode: {
		type: "enum",
		values: ["all", "one-at-a-time"] as const,
		default: "one-at-a-time",
		ui: {
			tab: "interaction",
			group: "输入",
			label: "跟进消息模式",
			description: "一轮完成后如何处理排队的跟进消息",
		},
	},

	interruptMode: {
		type: "enum",
		values: ["immediate", "wait"] as const,
		default: "immediate",
		ui: {
			tab: "interaction",
			group: "输入",
			label: "中断模式",
			description: "引导消息何时中断工具执行",
		},
	},

	"loop.mode": {
		type: "enum",
		values: ["prompt", "compact", "reset"] as const,
		default: "prompt",
		ui: {
			tab: "interaction",
			group: "输入",
			label: "循环模式",
			description: "/loop 迭代之间、重新提交提示之前发生什么",
			options: [
				{
					value: "prompt",
					label: "提示",
					description: "将提示作为跟进消息重新提交（当前行为）",
				},
				{
					value: "compact",
					label: "压缩",
					description: "压缩会话上下文，然后重新提交提示",
				},
				{ value: "reset", label: "重置", description: "开始新会话，然后重新提交提示" },
			],
		},
	},

	// Input and startup
	doubleEscapeAction: {
		type: "enum",
		values: ["branch", "tree", "none"] as const,
		default: "tree",
		ui: {
			tab: "interaction",
			group: "输入",
			label: "双击 Esc 操作",
			description: "编辑器为空时按两次 Escape 的操作",
		},
	},

	treeFilterMode: {
		type: "enum",
		values: ["default", "no-tools", "user-only", "labeled-only", "all"] as const,
		default: "default",
		ui: {
			tab: "interaction",
			group: "输入",
			label: "会话树过滤器",
			description: "打开会话树时的默认过滤模式",
		},
	},

	autocompleteMaxVisible: {
		type: "number",
		default: 5,
		ui: {
			tab: "interaction",
			group: "输入",
			label: "自动补全条目数",
			description: "自动补全下拉菜单中的可见条目数（3-20）",
			options: [
				{ value: "3", label: "3 个条目" },
				{ value: "5", label: "5 个条目" },
				{ value: "7", label: "7 个条目" },
				{ value: "10", label: "10 个条目" },
				{ value: "15", label: "15 个条目" },
				{ value: "20", label: "20 个条目" },
			],
		},
	},

	emojiAutocomplete: {
		type: "boolean",
		default: true,
		ui: {
			tab: "interaction",
			group: "输入",
			label: "表情自动补全",
			description: "从 `:name:` 短代码提示表情，并展开 `:D` 或 `:-)` 之类的文本表情符号",
		},
	},

	"paste.largeMenuThreshold": {
		type: "number",
		default: 100,
		ui: {
			tab: "interaction",
			group: "输入",
			label: "大段粘贴菜单",
			description:
				"当粘贴内容达到此行数时，提供菜单以将其包装进代码块、包装进 XML 标签或保存到文件。0 禁用该菜单（大段粘贴仍折叠为 [Paste] 标记）。",
			options: [
				{ value: "0", label: "关闭" },
				{ value: "100", label: "100 行" },
				{ value: "250", label: "250 行" },
				{ value: "500", label: "500 行" },
				{ value: "1000", label: "1000 行" },
			],
		},
	},

	"startup.quiet": {
		type: "boolean",
		default: false,
		ui: {
			tab: "interaction",
			group: "启动与更新",
			label: "安静启动",
			description: "跳过欢迎屏幕和启动状态消息",
		},
	},

	"startup.showSplash": {
		type: "boolean",
		default: false,
		ui: {
			tab: "interaction",
			group: "启动与更新",
			label: "显示启动画面",
			description:
				"在正常交互式启动时显示完整的动画设置画面，而不重新运行设置。安静启动仍会抑制它。",
		},
	},

	"startup.setupWizard": {
		type: "boolean",
		default: true,
		ui: {
			tab: "interaction",
			group: "启动与更新",
			label: "设置向导",
			description: "每个设置版本显示一次新添加的引导步骤",
		},
	},

	"startup.checkUpdate": {
		type: "boolean",
		default: true,
		ui: {
			tab: "interaction",
			group: "启动与更新",
			label: "检查更新",
			description: "启动时检查 omp 更新",
		},
	},

	"marketplace.autoUpdate": {
		type: "enum",
		values: ["off", "notify", "auto"] as const,
		default: "notify",
		ui: {
			tab: "interaction",
			group: "启动与更新",
			label: "市场自动更新",
			description: "启动时检查插件更新",
			options: [
				{ value: "off", label: "关闭", description: "不检查插件更新" },
				{ value: "notify", label: "通知", description: "启动时检查并在有可用更新时通知" },
				{ value: "auto", label: "自动", description: "启动时检查并自动安装更新" },
			],
		},
	},

	"startup.changelogMode": {
		type: "enum",
		values: ["summary", "expanded", "hidden"] as const,
		default: "summary",
		ui: {
			tab: "interaction",
			group: "启动与更新",
			label: "启动更新日志",
			description: "选择更新说明以摘要、完整详情显示还是保持隐藏",
			options: [
				{
					value: "summary",
					label: "摘要",
					description: "显示版本和变更计数，并带 /changelog 提示",
				},
				{
					value: "expanded",
					label: "展开",
					description: "完整显示最近的更新说明",
				},
				{
					value: "hidden",
					label: "隐藏",
					description: "启动时不显示更新说明",
				},
			],
		},
	},

	"magicKeywords.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "interaction",
			group: "魔法关键词",
			label: "魔法关键词",
			description: "为独立的 ultrathink、orchestrate 和 workflowz 关键词启用隐藏通知",
		},
	},

	"magicKeywords.ultrathink": {
		type: "boolean",
		default: true,
		ui: {
			tab: "interaction",
			group: "魔法关键词",
			label: "Ultrathink 关键词",
			description: "让独立的 ultrathink 请求最大自动思考并追加其隐藏通知",
		},
	},

	"magicKeywords.orchestrate": {
		type: "boolean",
		default: true,
		ui: {
			tab: "interaction",
			group: "魔法关键词",
			label: "Orchestrate 关键词",
			description: "让 standalone orchestrate 附加其隐藏的多智能体编排通知",
		},
	},

	"magicKeywords.workflow": {
		type: "boolean",
		default: true,
		ui: {
			tab: "interaction",
			group: "魔法关键词",
			label: "Workflow 关键词",
			description: "让 standalone workflowz 附加其隐藏的评估工作流通知",
		},
	},

	// Notifications
	"completion.notify": {
		type: "enum",
		values: ["on", "off"] as const,
		default: "on",
		ui: {
			tab: "interaction",
			group: "通知",
			label: "完成通知",
			description: "当智能体完成一轮时通知",
		},
	},

	"error.notify": {
		type: "enum",
		values: ["on", "off"] as const,
		default: "off",
		ui: {
			tab: "interaction",
			group: "通知",
			label: "错误通知",
			description: "当智能体因错误停止时通知",
		},
	},

	"ask.timeout": {
		type: "number",
		default: 0,
		ui: {
			tab: "interaction",
			group: "通知",
			label: "Ask 超时",
			description: "在此秒数后自动选择推荐的 ask 选项（0 表示禁用）",
			options: [
				{ value: "0", label: "禁用" },
				{ value: "15", label: "15 seconds" },
				{ value: "30", label: "30 seconds" },
				{ value: "60", label: "60 seconds" },
				{ value: "120", label: "120 seconds" },
			],
		},
	},

	"ask.notify": {
		type: "enum",
		values: ["on", "off"] as const,
		default: "on",
		ui: {
			tab: "interaction",
			group: "通知",
			label: "Ask 通知",
			description: "当 ask 工具等待输入时通知",
		},
	},

	"recap.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "interaction",
			group: "通知",
			label: "空闲摘要",
			description: "在终端空闲后生成简短 LLM 摘要，说明当前状态",
		},
	},

	"recap.idleSeconds": {
		type: "number",
		default: 240,
		ui: {
			tab: "interaction",
			group: "通知",
			label: "空闲摘要延迟",
			description: "空闲时等待显示摘要的秒数",
			options: [
				{ value: "60", label: "1 minute" },
				{ value: "120", label: "2 minutes" },
				{ value: "240", label: "4 minutes" },
				{ value: "300", label: "5 minutes" },
				{ value: "600", label: "10 minutes" },
			],
		},
	},

	// Collab
	"collab.relayUrl": {
		type: "string",
		default: DEFAULT_RELAY_URL,
		ui: {
			tab: "interaction",
			group: "协作",
			label: "Relay URL",
			description: "/collab 使用的 Relay（wss://host[:port]）",
		},
	},

	"collab.webUrl": {
		type: "string",
		default: "",
		ui: {
			tab: "interaction",
			group: "协作",
			label: "Web UI URL",
			description:
				"/collab 链接使用的浏览器 UI；为空时从 collab.relayUrl 派生；显式 http:// 仅限 localhost",
		},
	},

	"collab.displayName": {
		type: "string",
		default: "",
		ui: {
			tab: "interaction",
			group: "协作",
			label: "显示名称",
			description: "向其他 collab 参与者显示的名称（默认：操作系统用户名）",
		},
	},

	"share.serverUrl": {
		type: "string",
		default: DEFAULT_SHARE_URL,
		ui: {
			tab: "interaction",
			group: "协作",
			label: "Share 服务器",
			description:
				"/share 使用的共享查看器/上传基础（加密 blob 上传 + 查看器；链接格式为 <base>/<id>#<key>）",
		},
	},

	"share.store": {
		type: "enum",
		values: ["blob", "gist"] as const,
		default: "blob",
		ui: {
			tab: "interaction",
			group: "协作",
			label: "Share 存储",
			description: "/share 上传加密会话数据的位置",
			options: [
				{
					value: "blob",
					label: "加密数据块",
					description: "上传到 share 服务器（无需 GitHub 账户；避免 gist API 速率限制）",
				},
				{
					value: "gist",
					label: "GitHub Gist",
					description: "推送到 secret gist（需要已认证的 gh），失败时回退到 share 服务器",
				},
			],
		},
	},

	"share.redactSecrets": {
		type: "boolean",
		default: true,
		ui: {
			tab: "interaction",
			group: "协作",
			label: "Share 密钥编辑",
			description: "上传前对 /share 快照运行密钥混淆器（使用 secrets.* 配置）",
		},
	},

	// Speech-to-text
	"stt.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "interaction",
			group: "语音",
			label: "语音转文字",
			description: "通过麦克风启用语音转文字输入",
		},
	},

	"stt.language": {
		type: "string",
		default: "en",
	},

	"stt.modelName": {
		type: "enum",
		values: STT_MODEL_VALUES,
		default: DEFAULT_STT_MODEL_KEY,
		ui: {
			tab: "interaction",
			group: "语音",
			label: "语音模型",
			description:
				"本地设备端语音模型。Parakeet TDT v3 (sherpa-onnx) 是当前最优默认模型；Whisper base/small/large-v3-turbo 各档位 (transformers.js) 以模型大小换取多语言覆盖。首次使用时下载。",
			options: STT_MODEL_OPTIONS,
		},
	},
	"stt.submitTrigger": {
		type: "enum",
		values: STT_SUBMIT_TRIGGER_VALUES,
		default: "never",
		ui: {
			tab: "interaction",
			group: "语音",
			label: "语音转文字提交触发",
			description:
				"选择语音听写自动提交的时机：从不、松开（2个词以上）、松开时完成句子，或当我点击提交时。",
			options: STT_SUBMIT_TRIGGER_OPTIONS,
		},
	},

	// ────────────────────────────────────────────────────────────────────────
	// Context
	// ────────────────────────────────────────────────────────────────────────

	// Context promotion
	"contextPromotion.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "context",
			group: "常规",
			label: "自动提升上下文",
			description: "上下文溢出时提升到更大上下文模型，而不是压缩",
		},
	},

	// Compaction
	"compaction.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "context",
			group: "压缩",
			label: "自动压缩",
			description: "当上下文过大时自动压缩",
		},
	},

	"compaction.midTurnEnabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "context",
			group: "压缩",
			label: "回合中压缩",
			description: "在下次 provider 请求前于安全的回合中工具循环边界检查阈值",
		},
	},

	"compaction.strategy": {
		type: "enum",
		values: ["context-full", "handoff", "shake", "snapcompact", "off"] as const,
		default: "snapcompact",
		ui: {
			tab: "context",
			group: "压缩",
			label: "压缩策略",
			description:
				"选择就地完整上下文维护、自动交接、精准瘦身（丢弃重内容）、快照压缩（将历史归档为高密度图像），或禁用自动维护（off）",
			options: [
				{
					value: "context-full",
					label: "上下文已满",
					description: "就地总结并保持当前会话",
				},
				{ value: "handoff", label: "Handoff", description: "Generate handoff and continue in a new session" },
				{
					value: "shake",
					label: "Shake",
					description: "就地丢弃重内容（工具结果和大块数据）；通过 artifact 恢复",
				},
				{
					value: "snapcompact",
					label: "Snapcompact",
					description: "将历史归档为模型可读回的密集位图图像；不调用 LLM",
				},
				{
					value: "off",
					label: "关闭",
					description: "禁用自动上下文维护（与 Auto-compact off 行为相同）",
				},
			],
		},
	},

	"compaction.thresholdPercent": {
		type: "number",
		default: -1,
		ui: {
			tab: "context",
			group: "压缩",
			label: "压缩阈值",
			description: "上下文维护的百分比阈值；设置为 Default 以使用基于预留的旧行为",
			options: [
				{ value: "default", label: "默认", description: "Legacy reserve-based threshold" },
				{ value: "10", label: "10%", description: "Extremely early maintenance" },
				{ value: "20", label: "20%", description: "Very early maintenance" },
				{ value: "30", label: "30%", description: "Early maintenance" },
				{ value: "40", label: "40%", description: "Moderately early maintenance" },
				{ value: "50", label: "50%", description: "Halfway point" },
				{ value: "60", label: "60%", description: "Moderate context usage" },
				{ value: "70", label: "70%", description: "Balanced" },
				{ value: "75", label: "75%", description: "Slightly aggressive" },
				{ value: "80", label: "80%", description: "Typical threshold" },
				{ value: "85", label: "85%", description: "Aggressive context usage" },
				{ value: "90", label: "90%", description: "Very aggressive" },
				{ value: "95", label: "95%", description: "Near context limit" },
			],
		},
	},
	"compaction.thresholdTokens": {
		type: "number",
		default: -1,
		ui: {
			tab: "context",
			group: "压缩",
			label: "压缩 Token 限制",
			description: "上下文维护的固定 token 限制；若设置则覆盖百分比",
			options: [
				{ value: "default", label: "默认", description: "Use percentage-based threshold" },
				{ value: "25000", label: "25K tokens", description: "Quarter of a 200K window" },
				{ value: "50000", label: "50K tokens", description: "Half of a 200K window" },
				{ value: "100000", label: "100K tokens", description: "Half of a 200K window" },
				{ value: "150000", label: "150K tokens", description: "Three-quarters of a 200K window" },
				{ value: "200000", label: "200K tokens", description: "Full standard context window" },
				{ value: "300000", label: "300K tokens", description: "Large context window" },
				{ value: "500000", label: "500K tokens", description: "Very large context window" },
			],
		},
	},

	"compaction.handoffSaveToDisk": {
		type: "boolean",
		default: false,
		ui: {
			tab: "context",
			group: "压缩",
			label: "保存 Handoff 文档",
			description: "将生成的 handoff 文档保存为 markdown 文件，用于自动 handoff 流程",
		},
	},

	"compaction.remoteEnabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "context",
			group: "压缩",
			label: "远程压缩",
			description: "可用时使用远程压缩端点，而不是本地总结",
		},
	},

	"compaction.remoteStreamingV2Enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "context",
			group: "压缩",
			label: "远程压缩 V2",
			description: "对兼容的远程压缩模型使用 Responses 流式压缩",
		},
	},

	// No default: an unset reserve tells the compaction layer the user never
	// chose one, so small-window recovery may swap in the proportional reserve
	// (see resolveBudgetReserveTokens). A materialized 16384 here would make
	// every session look explicitly configured.
	"compaction.reserveTokens": { type: "number", default: undefined },

	"compaction.keepRecentTokens": { type: "number", default: 20000 },

	"compaction.autoContinue": { type: "boolean", default: true },

	"compaction.remoteEndpoint": { type: "string", default: undefined },

	"compaction.v2RetainedMessageBudget": { type: "number", default: 64000 },

	// Idle compaction
	"compaction.idleEnabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "context",
			group: "压缩",
			label: "空闲压缩",
			description: "空闲时当 token 数超过阈值时压缩上下文",
		},
	},

	"compaction.idleThresholdTokens": {
		type: "number",
		default: 200000,
		ui: {
			tab: "context",
			group: "压缩",
			label: "空闲压缩阈值",
			description: "触发空闲压缩的 token 数阈值",
			options: [
				{ value: "100000", label: "100K tokens" },
				{ value: "200000", label: "200K tokens" },
				{ value: "300000", label: "300K tokens" },
				{ value: "400000", label: "400K tokens" },
				{ value: "500000", label: "500K tokens" },
				{ value: "600000", label: "600K tokens" },
				{ value: "700000", label: "700K tokens" },
				{ value: "800000", label: "800K tokens" },
				{ value: "900000", label: "900K tokens" },
			],
		},
	},

	"compaction.idleTimeoutSeconds": {
		type: "number",
		default: 300,
		ui: {
			tab: "context",
			group: "压缩",
			label: "空闲压缩延迟",
			description: "空闲时等待压缩的秒数",
			options: [
				{ value: "60", label: "1 minute" },
				{ value: "120", label: "2 minutes" },
				{ value: "300", label: "5 minutes" },
				{ value: "600", label: "10 minutes" },
				{ value: "1800", label: "30 minutes" },
				{ value: "3600", label: "1 hour" },
			],
		},
	},

	"compaction.supersedeReads": {
		type: "boolean",
		default: true,
		ui: {
			tab: "context",
			group: "压缩",
			label: "替换过期读取",
			description: "当同一文件再次被读取时修剪旧读取结果（缓存感知，每轮运行）",
		},
	},

	"compaction.dropUseless": {
		type: "boolean",
		default: true,
		ui: {
			tab: "context",
			group: "压缩",
			label: "省略无事件结果",
			description:
				"消耗后（感知缓存）自动清理被标记为上下文无用的工具结果（无匹配、等待超时）",
		},
	},

	// Experimental: snapcompact inline imaging (transient, per-request; never persisted)
	"snapcompact.systemPrompt": {
		type: "enum",
		values: ["none", "agents-md", "all"] as const,
		default: "none",
		ui: {
			tab: "context",
			group: "实验",
			label: "Snapcompact 系统提示",
			description:
				"实验性：将选定的系统提示文本渲染为高密度 PNG 图像并附加到第一条用户消息（仅限视觉模型）。节省令牌；但图像化文本会失去提示缓存。",
			options: [
				{ value: "none", label: "无", description: "Keep the system prompt as text." },
				{
					value: "agents-md",
					label: "AGENTS.md",
					description: "仅在节省 token 时，将已加载的上下文文件指令移到图像中。",
				},
				{
					value: "all",
					label: "全部",
					description: "在节省 token 时，将完整系统提示移到图像中。",
				},
			],
		},
	},

	"snapcompact.toolResults": {
		type: "boolean",
		default: false,
		ui: {
			tab: "context",
			group: "实验",
			label: "Snapcompact 工具结果",
			description:
				"实验性：将大型历史工具结果渲染为高密度 PNG 图像而非文本（仅限视觉模型）。在累积的读取/搜索输出上节省令牌。",
		},
	},

	"tools.format": {
		type: "enum",
		values: [
			"auto",
			"native",
			"glm",
			"hermes",
			"kimi",
			"xml",
			"anthropic",
			"deepseek",
			"harmony",
			"qwen3",
			"gemini",
			"gemma",
			"minimax",
		] as const,
		default: "auto",
		ui: {
			tab: "context",
			group: "实验",
			label: "工具调用模式",
			description:
				"控制工具如何暴露给模型。自动模式使用提供商原生工具调用，除非所选模型被标记为不支持，此时回退到 GLM 专属方言。Native 强制使用提供商原生工具；其他值强制使用指定的专属方言。在会话开始时生效。",
			options: [
				{
					value: "auto",
					label: "自动",
					description: "使用原生工具调用，除非已知模型不支持。",
				},
				{ value: "native", label: "原生", description: "Use provider-native tool calls." },
				{ value: "glm", label: "GLM", description: "Use GLM-style in-band tool calls." },
				{ value: "hermes", label: "Hermes", description: "Use Hermes-style in-band tool calls." },
				{ value: "kimi", label: "Kimi", description: "Use Kimi-style in-band tool calls." },
				{ value: "xml", label: "XML", description: "Use generic XML in-band tool calls." },
				{ value: "anthropic", label: "Anthropic", description: "Use Anthropic-style in-band tool calls." },
				{ value: "deepseek", label: "DeepSeek", description: "Use DeepSeek-style in-band tool calls." },
				{ value: "harmony", label: "Harmony", description: "Use Harmony-style in-band tool calls." },
				{ value: "qwen3", label: "Qwen3", description: "Use the Qwen3 owned dialect." },
				{ value: "gemini", label: "Gemini", description: "Use the Gemini owned dialect." },
				{ value: "gemma", label: "Gemma", description: "Use the Gemma owned dialect." },
				{ value: "minimax", label: "MiniMax", description: "Use the MiniMax owned dialect." },
			],
		},
	},

	"snapcompact.shape": {
		type: "enum",
		values: ["auto", ...SHAPE_VARIANT_NAMES] as const,
		default: "auto",
		ui: {
			tab: "context",
			group: "实验",
			label: "Snapcompact 字形",
			description:
				"帧形状 snapcompact 使用（压缩归档和行内成像）打印文本。Auto 会为当前模型选择调整后的形状。",
			options: [
				{
					value: "auto",
					label: "自动",
					description: "选择针对当前模型调校的字形，并回退到其提供商系列。",
				},
				{
					value: "8x8r-bw",
					label: "8x8 平铺，黑色",
					description:
						"unscii 方形单元格，黑色墨水，每一行打印两次，副本位于浅色高亮带上。",
				},
				{
					value: "8x8r-sent",
					label: "8x8 平铺，句子色调",
					description: "平铺网格，墨色在句子边界处循环六种色调。",
				},
				{
					value: "8x8u-bw",
					label: "8x8，黑色",
					description: "朴素的 unscii 方形单元格，单次打印线条，黑色墨水。",
				},
				{
					value: "8x8u-sent",
					label: "8x8，句子色调",
					description: "朴素的 unscii 方形单元格，使用句子色调墨水。",
				},
				{
					value: "6x6u-bw",
					label: "6x6 密集，黑色",
					description: "unscii 压缩至 6x6 — 最密集的可读单元格，帧数最少 — 使用黑色墨水。",
				},
				{
					value: "6x6u-sent",
					label: "6x6 密集，句子色调",
					description: "最密集的单元格，使用句子色调墨水。",
				},
				{
					value: "5x8-bw",
					label: "5x8 旧版，黑色",
					description: "原始 X.org 5x8 字形，位于 2576px 帧上，黑色墨水。",
				},
				{
					value: "5x8-sent",
					label: "5x8 旧版，句子色调",
					description: "原始的 snapcompact 字形 (早于形状表的会话渲染为此形式)。",
				},
				{
					value: "6x12-dim",
					label: "6x12，停用词变暗",
					description: "X.org 6x12 字形，黑色墨水，功能词灰显。",
				},
				{
					value: "8x13-bw",
					label: "8x13，黑色",
					description: "X.org 8x13 字形，黑色墨水。",
				},
				{
					value: "8on16-bw",
					label: "8x13，16px 间距，黑色",
					description: "8x13 字形位于 8x16 单元格 (额外行距)，黑色墨水。",
				},
				{
					value: "8on22-bw",
					label: "8x13，22px 间距 (行距)，黑色",
					description:
						"8x22 单元格上的 8x13 字形 — 额外的行距避免行拥挤。OpenAI/Google 的默认设置。",
				},
				{
					value: "11on16-bw",
					label: "8x13，11px 字符步进 (字距)，黑色",
					description:
						"11x16 单元格上的 8x13 字形 — 额外的字距避免字符合并。Anthropic 的默认设置。",
				},
				{
					value: "silver16-bw",
					label: "Silver 16，CJK",
					description: "嵌入的 Silver TrueType 字体，位于 16px 网格上，用于 CJK 和其他非拉丁文本。",
				},
				{
					value: "doc-8on16-bw",
					label: "文档 8on16，黑色",
					description: "16px 间距上的两栏自动换行报纸式 8x13 字形，黑色墨水。",
				},
				{
					value: "doc-8on16-sent",
					label: "文档 8on16，句子色调",
					description: "两栏文档布局，使用句子色调墨水。",
				},
				{
					value: "doc-8on16-sent-dim",
					label: "文档 8on16，句子色调 + 停用词变暗",
					description: "两栏文档布局，句子色调墨水，功能词灰显。",
				},
			],
		},
	},

	// Branch summaries
	"branchSummary.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "context",
			group: "常规",
			label: "分支摘要",
			description: "离开分支时提示总结",
		},
	},

	"branchSummary.reserveTokens": { type: "number", default: 16384 },

	// Memories
	// Legacy local-memory enable flag kept only for back-compat migration.
	// Hidden from UI — users should use `memory.backend` instead.
	"memories.enabled": {
		type: "boolean",
		default: false,
	},

	"memories.maxRolloutsPerStartup": { type: "number", default: 64 },

	"memories.maxRolloutAgeDays": { type: "number", default: 30 },

	"memories.minRolloutIdleHours": { type: "number", default: 12 },

	"memories.threadScanLimit": { type: "number", default: 300 },

	"memories.maxRawMemoriesForGlobal": { type: "number", default: 200 },

	"memories.stage1Concurrency": { type: "number", default: 8 },

	"memories.stage1LeaseSeconds": { type: "number", default: 120 },

	"memories.stage1RetryDelaySeconds": { type: "number", default: 120 },

	"memories.phase2LeaseSeconds": { type: "number", default: 180 },

	"memories.phase2RetryDelaySeconds": { type: "number", default: 180 },

	"memories.phase2HeartbeatSeconds": { type: "number", default: 30 },

	"memories.rolloutPayloadPercent": { type: "number", default: 0.7 },

	"memories.phase1InputTokenLimit": { type: "number", default: 4000 },

	"memories.fallbackTokenLimit": { type: "number", default: 16000 },

	"memories.summaryInjectionTokenLimit": { type: "number", default: 5000 },

	// Memory backend selector — picks between local memories pipeline,
	// Mnemopi local SQLite, Hindsight remote memory, or off. The legacy
	// `memories.enabled` flag is migration input only; see config/settings.ts.
	"memory.backend": {
		type: "enum",
		values: ["off", "local", "hindsight", "mnemopi"] as const,
		default: "off",
		ui: {
			tab: "memory",
			group: "常规",
			label: "记忆后端",
			description: "Off、本地摘要管道、Mnemopi SQLite 或 Hindsight 远程记忆",
			options: [
				{ value: "off", label: "关闭", description: "No memory subsystem runs" },
				{ value: "local", label: "本地", description: "Local rollout summarisation pipeline (memory_summary.md)" },
				{ value: "hindsight", label: "Hindsight", description: "Vectorize Hindsight remote memory service" },
				{
					value: "mnemopi",
					label: "Mnemopi",
					description: "本地 SQLite 回忆/保留后端，支持可选嵌入",
				},
			],
		},
	},

	// Auto-Learn (experimental): post-stop nudge to capture lessons to memory
	// and mint/enhance isolated managed skills under ~/.omp/agent/managed-skills.
	// Master flag is default-off → zero footprint; sub-flags gate behaviour.
	"autolearn.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "memory",
			group: "自动学习",
			label: "自动学习 (实验性)",
			description:
				"在代理停止后，提示它将经验写入记忆并创建/增强独立的管理技能",
		},
	},
	"autolearn.autoContinue": {
		type: "boolean",
		default: false,
		ui: {
			tab: "memory",
			group: "自动学习",
			label: "停止时自动捕获",
			description:
				"开启时，在停止时自动运行一次私有捕获回合（消耗额外令牌）。关闭时，仅保留常规自动学习指导。",
			condition: "autolearnActive",
		},
	},
	// Config-file-only knob (numbers without `options` are hidden from the UI).
	"autolearn.minToolCalls": { type: "number", default: 5 },

	// Mnemopi local SQLite memory backend.
	"mnemopi.dbPath": {
		type: "string",
		default: undefined,
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi DB 路径",
			description: "可选的 SQLite 数据库路径。默认为智能体记忆目录。",
			condition: "mnemopiActive",
		},
	},
	"mnemopi.bank": {
		type: "string",
		default: undefined,
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi 记忆库",
			description: "可选的共享记忆库基础名称。按项目模式会从中派生项目本地记忆库。",
			condition: "mnemopiActive",
		},
	},
	"mnemopi.scoping": {
		type: "enum",
		values: ["global", "per-project", "per-project-tagged"] as const,
		default: "per-project",
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi 作用域",
			description:
				"global = 一个共享库；per-project = 按 cwd 隔离的库；per-project-tagged = 项目本地写入 + 全局召回可见性",
			options: [
				{
					value: "global",
					label: "全局",
					description: "每个项目共用一个 Mnemopi 记忆库",
				},
				{
					value: "per-project",
					label: "按项目",
					description: "按 cwd 基名使用项目本地 Mnemopi 记忆库",
				},
				{
					value: "per-project-tagged",
					label: "按项目 (带标签)",
					description: "写入项目本地记忆库，但合并项目与共享回忆结果",
				},
			],
			condition: "mnemopiActive",
		},
	},
	"mnemopi.embeddingVariant": {
		type: "enum",
		values: ["en", "multilingual"] as const,
		default: "en",
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "嵌入变体",
			description:
				"本地嵌入模型系列。en = 更强的英语模型；multilingual = 跨语言模型。更改此选项将在下次启动时重建现有记忆嵌入。",
			options: [
				{
					value: "en",
					label: "英语 (bge-base-en-v1.5)",
					description: "BAAI/bge-base-en-v1.5 (768d)，仅英语",
				},
				{
					value: "multilingual",
					label: "多语言 (multilingual-e5-large)",
					description: "intfloat/multilingual-e5-large (1024d)，跨语言回忆",
				},
			],
			condition: "mnemopiActive",
		},
	},
	"mnemopi.autoRecall": {
		type: "boolean",
		default: true,
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi 自动回忆",
			description: "在每个会话的首轮回忆本地记忆",
			condition: "mnemopiActive",
		},
	},
	"mnemopi.autoRetain": {
		type: "boolean",
		default: true,
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi 自动保留",
			description: "将已完成的对话轮次保留到本地 Mnemopi 记忆",
			condition: "mnemopiActive",
		},
	},
	"mnemopi.polyphonicRecall": {
		type: "boolean",
		default: false,
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi 多声部回忆",
			description: "启用 4 声部回忆 (向量、图、事实、时间)，并使用倒数排名融合进行融合",
			condition: "mnemopiActive",
		},
	},
	"mnemopi.enhancedRecall": {
		type: "boolean",
		default: false,
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi 增强回忆",
			description: "为重复和相似的回忆查询启用分层查询结果缓存",
			condition: "mnemopiActive",
		},
	},
	"mnemopi.proactiveLinking": {
		type: "boolean",
		default: false,
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi 主动关联",
			description:
				"在存储新记忆时将其摄入情景图，并链接到相关实体和记忆",
			condition: "mnemopiActive",
		},
	},
	"mnemopi.noEmbeddings": {
		type: "boolean",
		default: false,
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi 禁用嵌入",
			description: "强制使用确定性的仅 FTS 回忆，而非向量嵌入",
			condition: "mnemopiActive",
		},
	},
	"mnemopi.embeddingModel": {
		type: "string",
		default: undefined,
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi 嵌入模型",
			description:
				"高级：覆盖变体的显式嵌入模型 id。留空以使用 mnemopi.embeddingVariant。",
			condition: "mnemopiActive",
		},
	},
	"mnemopi.embeddingApiUrl": {
		type: "string",
		default: undefined,
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi 嵌入 API URL",
			description: "传递给 Mnemopi 的可选 OpenAI 兼容嵌入端点",
			condition: "mnemopiActive",
		},
	},
	"mnemopi.embeddingApiKey": {
		type: "string",
		credential: true,
		default: undefined,
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi 嵌入 API 密钥",
			description: "传递给 Mnemopi 的可选嵌入 API 密钥",
			condition: "mnemopiActive",
		},
	},
	"mnemopi.llmMode": {
		type: "enum",
		values: ["none", "smol", "remote"] as const,
		default: "smol",
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi LLM 模式",
			description:
				"使用无 LLM、在线极小模型（来自 /models 的 TINY 角色，否则 @smol），或远程兼容 OpenAI 的端点",
			condition: "mnemopiActive",
			options: [
				{ value: "none", label: "无", description: "Disable Mnemopi LLM-backed extraction" },
				{
					value: "smol",
					label: "在线 (tiny)",
					description: "使用在线 tiny 模型 (来自 /models 的 TINY 角色，否则为 @smol)",
				},
				{ value: "remote", label: "远程", description: "Use the Mnemopi remote LLM settings below" },
			],
		},
	},
	"mnemopi.llmBaseUrl": {
		type: "string",
		default: undefined,
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi LLM 基础 URL",
			description: "用于 Mnemopi 远程模式的可选 OpenAI 兼容 LLM 端点",
			condition: "mnemopiActive",
		},
	},
	"mnemopi.llmApiKey": {
		type: "string",
		credential: true,
		default: undefined,
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi LLM API 密钥",
			description: "用于 Mnemopi 远程模式的可选 LLM API 密钥",
			condition: "mnemopiActive",
		},
	},
	"mnemopi.llmModel": {
		type: "string",
		default: undefined,
		ui: {
			tab: "memory",
			group: "Mnemopi",
			label: "Mnemopi LLM 模型",
			description: "用于 Mnemopi 远程模式的可选 LLM 模型名称",
			condition: "mnemopiActive",
		},
	},
	"mnemopi.retainEveryNTurns": { type: "number", default: 4 },
	"mnemopi.recallLimit": { type: "number", default: 8 },
	"mnemopi.recallContextTurns": { type: "number", default: 3 },
	"mnemopi.recallMaxQueryChars": { type: "number", default: 4000 },
	"mnemopi.injectionTokenLimit": { type: "number", default: 5000 },
	"mnemopi.debug": { type: "boolean", default: false },

	// Hindsight (https://hindsight.vectorize.io)
	"hindsight.apiUrl": {
		type: "string",
		default: "http://localhost:8888",
		ui: {
			tab: "memory",
			group: "回溯",
			label: "Hindsight API URL",
			description: "Hindsight 服务器 URL (云端或自托管)",
			condition: "hindsightActive",
		},
	},

	"hindsight.apiToken": {
		type: "string",
		credential: true,
		default: undefined,
		ui: {
			tab: "memory",
			group: "回溯",
			label: "Hindsight API 令牌",
			description: "用于经过身份验证的 Hindsight 服务器的 Bearer 令牌",
			condition: "hindsightActive",
		},
	},

	"hindsight.bankId": {
		type: "string",
		default: undefined,
		ui: {
			tab: "memory",
			group: "回溯",
			label: "Hindsight 记忆库 ID",
			description: "记忆库标识符 (默认：项目名称)",
			condition: "hindsightActive",
		},
	},

	"hindsight.bankIdPrefix": { type: "string", default: undefined },
	"hindsight.scoping": {
		type: "enum",
		values: ["global", "per-project", "per-project-tagged"] as const,
		default: "per-project-tagged",
		ui: {
			tab: "memory",
			group: "回溯",
			label: "Hindsight 作用域",
			description:
				"global = 一个共享库；per-project = 按 cwd 隔离的库；per-project-tagged = 带项目标签的共享库，使全局 + 项目记忆在召回时合并",
			options: [
				{
					value: "global",
					label: "全局",
					description: "一个共享记忆库 — 每个项目看到相同的记忆",
				},
				{
					value: "per-project",
					label: "按项目",
					description: "每个 cwd 基名的独立记忆库 — 项目之间无法看到彼此的记忆",
				},
				{
					value: "per-project-tagged",
					label: "按项目 (带标签)",
					description:
						"共享库，保留带有 project:<cwd> 标签的内容。召回时同时呈现项目 + 未标记的全局记忆",
				},
			],
			condition: "hindsightActive",
		},
	},
	"hindsight.bankMission": { type: "string", default: undefined },
	"hindsight.retainMission": { type: "string", default: undefined },

	"hindsight.autoRecall": {
		type: "boolean",
		default: true,
		ui: {
			tab: "memory",
			group: "回溯",
			label: "Hindsight 自动回忆",
			description: "在每个会话的首轮回忆记忆",
			condition: "hindsightActive",
		},
	},
	"hindsight.autoRetain": {
		type: "boolean",
		default: true,
		ui: {
			tab: "memory",
			group: "回溯",
			label: "Hindsight 自动保留",
			description: "每 N 轮及会话边界处保留转录",
			condition: "hindsightActive",
		},
	},

	"hindsight.retainMode": {
		type: "enum",
		values: ["full-session", "last-turn"] as const,
		default: "full-session",
		ui: {
			tab: "memory",
			group: "回溯",
			label: "Hindsight 保留模式",
			description: "full-session = 每个会话 upsert 一个文档，last-turn = 分块",
			options: [
				{
					value: "full-session",
					label: "完整会话",
					description: "每个会话 upsert 一个文档 (推荐)",
				},
				{ value: "last-turn", label: "仅最后回合", description: "Chunked retention sliced by turn boundaries" },
			],
			condition: "hindsightActive",
		},
	},
	"hindsight.retainEveryNTurns": { type: "number", default: 3 },
	"hindsight.retainOverlapTurns": { type: "number", default: 2 },
	"hindsight.retainContext": { type: "string", default: "omp" },

	"hindsight.recallBudget": {
		type: "enum",
		values: ["low", "mid", "high"] as const,
		default: "mid",
	},
	"hindsight.recallMaxTokens": { type: "number", default: 1024 },
	"hindsight.recallContextTurns": { type: "number", default: 1 },
	"hindsight.recallMaxQueryChars": { type: "number", default: 800 },
	"hindsight.recallTypes": { type: "array", default: HINDSIGHT_RECALL_TYPES_DEFAULT },

	"hindsight.debug": { type: "boolean", default: false },

	"hindsight.requestTimeoutMs": { type: "number", default: 30_000 },
	"hindsight.reflectTimeoutMs": { type: "number", default: 120_000 },
	"hindsight.recallTimeoutMs": { type: "number", default: 30_000 },
	"hindsight.retainTimeoutMs": { type: "number", default: 60_000 },

	"hindsight.mentalModelsEnabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "memory",
			group: "回溯",
			label: "Hindsight 心智模型",
			description:
				"启动时将精选的反思摘要（心智模型）读入开发者指令。加载库中已有的模型 — 不进行写入。与 hindsight.mentalModelAutoSeed 配合可同时自动创建内置种子集。",
			condition: "hindsightActive",
		},
	},
	"hindsight.mentalModelAutoSeed": {
		type: "boolean",
		default: true,
		ui: {
			tab: "memory",
			group: "回溯",
			label: "Hindsight 心智模型自动初始化",
			description:
				"会话开始时，创建库中尚不存在的内置心智模型（project-conventions、project-decisions、user-preferences）。",
			condition: "hindsightActive",
		},
	},
	"hindsight.mentalModelRefreshIntervalMs": { type: "number", default: 5 * 60 * 1000 },
	"hindsight.mentalModelMaxRenderChars": { type: "number", default: 16_000 },

	// TTSR
	"ttsr.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "context",
			group: "规则 (TTSR)",
			label: "TTSR",
			description: "当输出匹配规则模式时，中断智能体的输出流 (Time-Traveling Stream Rules)",
		},
	},

	"ttsr.contextMode": {
		type: "enum",
		values: ["discard", "keep"] as const,
		default: "discard",
		ui: {
			tab: "context",
			group: "规则 (TTSR)",
			label: "TTSR 上下文模式",
			description: "当 TTSR 触发时，如何处理部分输出",
		},
	},

	"ttsr.interruptMode": {
		type: "enum",
		values: ["never", "prose-only", "tool-only", "always"] as const,
		default: "always",
		ui: {
			tab: "context",
			group: "规则 (TTSR)",
			label: "TTSR 中断模式",
			description: "决定是在输出流中中断还是在完成后注入警告",
			options: [
				{ value: "always", label: "始终", description: "Interrupt on prose and tool streams" },
				{ value: "prose-only", label: "仅自然语言", description: "Interrupt only on reply/thinking matches" },
				{ value: "tool-only", label: "仅工具", description: "Interrupt only on tool-call argument matches" },
				{ value: "never", label: "从不", description: "Never interrupt; inject warning after completion" },
			],
		},
	},

	"ttsr.repeatMode": {
		type: "enum",
		values: ["once", "after-gap"] as const,
		default: "once",
		ui: {
			tab: "context",
			group: "规则 (TTSR)",
			label: "TTSR 重复模式",
			description: "规则如何重复：每个会话一次，或在一段消息间隔后",
		},
	},

	"ttsr.repeatGap": {
		type: "number",
		default: 10,
		ui: {
			tab: "context",
			group: "规则 (TTSR)",
			label: "TTSR 重复间隔",
			description: "规则可再次触发前需要间隔的消息数",
			options: [
				{ value: "5", label: "5 messages" },
				{ value: "10", label: "10 messages" },
				{ value: "15", label: "15 messages" },
				{ value: "20", label: "20 messages" },
				{ value: "30", label: "30 messages" },
			],
		},
	},

	"ttsr.builtinRules": {
		type: "boolean",
		default: true,
		ui: {
			tab: "context",
			group: "规则 (TTSR)",
			label: "内置规则",
			description: "加载随智能体附带的默认规则 (使用 ttsr.disabledRules 单独覆盖)",
		},
	},

	"ttsr.disabledRules": {
		type: "array",
		default: [] as string[],
		ui: {
			tab: "context",
			group: "规则 (TTSR)",
			label: "禁用的规则",
			description: "要完全忽略的规则名称 (适用于内置默认规则和你自己的规则)",
		},
	},

	// ────────────────────────────────────────────────────────────────────────
	// Editing
	// ────────────────────────────────────────────────────────────────────────

	// Edit tool
	"edit.mode": {
		type: "enum",
		values: EDIT_MODES,
		default: "hashline",
		ui: {
			tab: "files",
			group: "编辑",
			label: "编辑模式",
			description: "选择编辑工具变体 (replace、patch、hashline 或 apply_patch)",
		},
	},

	"edit.fuzzyMatch": {
		type: "boolean",
		default: true,
		ui: {
			tab: "files",
			group: "编辑",
			label: "模糊匹配",
			description: "接受针对空白差异的高置信度模糊匹配",
		},
	},

	"edit.fuzzyThreshold": {
		type: "number",
		default: 0.95,
		ui: {
			tab: "files",
			group: "编辑",
			label: "模糊匹配阈值",
			description: "接受模糊匹配的相似度阈值 (0-1)",
			options: [
				{ value: "0.85", label: "0.85", description: "Lenient" },
				{ value: "0.90", label: "0.90", description: "Moderate" },
				{ value: "0.95", label: "0.95", description: "默认" },
				{ value: "0.98", label: "0.98", description: "Strict" },
			],
		},
	},

	"edit.streamingAbort": {
		type: "boolean",
		default: false,
		ui: {
			tab: "files",
			group: "编辑",
			label: "预览失败时中止",
			description: "当补丁预览失败时，中止流式编辑工具调用",
		},
	},

	"edit.blockAutoGenerated": {
		type: "boolean",
		default: true,
		ui: {
			tab: "files",
			group: "编辑",
			label: "阻止自动生成的文件",
			description: "防止编辑看似自动生成的文件 (protoc、sqlc、swagger 等)",
		},
	},

	"edit.enforceSeenLines": {
		type: "boolean",
		default: false,
		ui: {
			tab: "files",
			group: "编辑",
			label: "强制已见行保护",
			description: "拒绝锚定在先前读取/搜索未完整显示的行上的编辑",
		},
	},

	readLineNumbers: {
		type: "boolean",
		default: false,
		ui: {
			tab: "files",
			group: "阅读",
			label: "行号",
			description: "默认在读取工具输出前添加行号",
		},
	},

	"read.defaultLimit": {
		type: "number",
		default: 300,
		ui: {
			tab: "files",
			group: "阅读",
			label: "默认读取限制",
			description: "代理调用 read 且未指定限制时返回的默认行数",
			options: [
				{ value: "200", label: "200 lines" },
				{ value: "300", label: "300 lines" },
				{ value: "500", label: "500 lines" },
				{ value: "1000", label: "1000 lines" },
				{ value: "5000", label: "5000 lines" },
			],
		},
	},

	"read.renderMarkdown": {
		type: "boolean",
		default: false,
		ui: {
			tab: "files",
			group: "阅读",
			label: "Markdown 预览",
			description: "将 Markdown 读取结果渲染为格式化终端 Markdown 预览，而非原始源码",
		},
	},

	"read.summarize.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "files",
			group: "阅读摘要",
			label: "读取摘要",
			description: "当 read 未指定显式选择器调用时，返回结构化代码摘要",
		},
	},

	"read.summarize.prose": {
		type: "boolean",
		default: false,
		ui: {
			tab: "files",
			group: "阅读摘要",
			label: "文本摘要",
			description: "为 Markdown 和纯文本读取返回结构化摘要",
		},
	},

	"read.summarize.minBodyLines": {
		type: "number",
		default: 4,
		ui: {
			tab: "files",
			group: "阅读摘要",
			label: "读取摘要正文行数",
			description: "在读取摘要折叠前，多行正文或字面量的最小长度",
		},
	},

	"read.summarize.minCommentLines": {
		type: "number",
		default: 6,
		ui: {
			tab: "files",
			group: "阅读摘要",
			label: "读取摘要注释行数",
			description: "在读取摘要折叠前，多行块注释的最小长度",
		},
	},

	"read.summarize.minTotalLines": {
		type: "number",
		default: 100,
		ui: {
			tab: "files",
			group: "阅读摘要",
			label: "读取摘要最小文件长度",
			description: "总行数较少的文件将逐字读取，而非结构化摘要",
		},
	},

	"read.summarize.unfoldUntil": {
		type: "number",
		default: 50,
		ui: {
			tab: "files",
			group: "阅读摘要",
			label: "读取摘要展开目标",
			description:
				"BFS 展开可省略片段，直到摘要至少达到此可见行数。0 仅保留最外层的省略。",
		},
	},

	"read.summarize.unfoldLimit": {
		type: "number",
		default: 100,
		ui: {
			tab: "files",
			group: "阅读摘要",
			label: "读取摘要展开上限",
			description:
				"BFS 展开期间摘要大小的硬上限。若展开后显示的行数会超过此值，则跳过该展开（该片段保持折叠），并继续展开其余片段。",
		},
	},

	"read.toolResultPreview": {
		type: "boolean",
		default: false,
		ui: {
			tab: "files",
			group: "阅读",
			label: "内联读取预览",
			description: "将读取工具结果内联渲染在记录中，而非摘要行",
		},
	},

	// LSP
	"lsp.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "files",
			group: "LSP",
			label: "LSP",
			description: "启用 lsp 工具进行代码智能（定义、引用、诊断、重命名）",
		},
	},

	"lsp.lazy": {
		type: "boolean",
		default: true,
		ui: {
			tab: "files",
			group: "LSP",
			label: "延迟 LSP 启动",
			description:
				"在首次使用（lsp 工具或编辑匹配的文件类型）时启动语言服务器，而不是在会话启动时",
		},
	},

	"lsp.shared": {
		type: "boolean",
		default: true,
		ui: {
			tab: "files",
			group: "LSP",
			label: "共享语言服务器",
			description:
				"通过守护进程代理在 omp 实例之间共享每个项目一个语言服务器（不可用时回退到私有服务器）",
		},
	},

	"lsp.formatOnWrite": {
		type: "boolean",
		default: false,
		ui: {
			tab: "files",
			group: "LSP",
			label: "写入时格式化",
			description: "写入后使用 LSP 自动格式化代码文件",
		},
	},

	"lsp.diagnosticsOnWrite": {
		type: "boolean",
		default: true,
		ui: {
			tab: "files",
			group: "LSP",
			label: "写入时诊断",
			description: "写入代码文件后返回 LSP 诊断",
		},
	},

	"lsp.diagnosticsOnEdit": {
		type: "boolean",
		default: false,
		ui: {
			tab: "files",
			group: "LSP",
			label: "编辑时诊断",
			description: "编辑代码文件后返回 LSP 诊断",
		},
	},

	"lsp.diagnosticsDeduplicate": {
		type: "boolean",
		default: true,
		ui: {
			tab: "files",
			group: "LSP",
			label: "诊断去重",
			description: "抑制编辑后已为文件显示的 LSP 诊断；仅显示新增或更改的诊断",
		},
	},

	"bash.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "shell",
			group: "Bash",
			label: "Bash",
			description: "启用 bash 工具执行 shell 命令",
		},
	},

	"bash.autoBackground.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "shell",
			group: "Bash",
			label: "Bash 自动后台",
			description: "自动将长时间运行的 bash 命令置于后台，并在稍后返回结果",
		},
	},
	"bash.patterns": {
		type: "array",
		default: [],
		ui: {
			tab: "shell",
			group: "Bash",
			label: "Bash 审批模式",
			description:
				"有序的 bash 命令审批规则。每个项具有 match 和 approval 字段；仅支持 '*' 通配符。",
		},
	},

	// Bash interceptor
	"bashInterceptor.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "shell",
			group: "Bash",
			label: "Bash 拦截器",
			description: "阻止已有专用工具的 shell 命令",
		},
	},
	"bashInterceptor.patterns": { type: "array", default: DEFAULT_BASH_INTERCEPTOR_RULES },

	"bash.direnv": {
		type: "enum",
		values: ["auto", "off"] as const,
		default: "auto",
		ui: {
			tab: "shell",
			group: "Bash",
			label: "direnv 自动加载",
			description:
				"自动将仓库的 direnv/devenv `.envrc` 加载到 bash 会话中，以便无需手动 `direnv exec` 即可使用 devenv 工具和环境变量。遵循 direnv 的允许列表：未经 `direnv allow` 的 `.envrc` 永远不会被执行",
		},
	},
	"bash.direnvLoadTimeoutMs": {
		type: "number",
		default: 30_000,
		ui: {
			tab: "shell",
			group: "Bash",
			label: "direnv 加载超时（毫秒）",
			description:
				"首次 `direnv export` 的最大等待时间（冷 devenv shell 可能很慢）；超时会话将在没有 direnv 环境的情况下运行",
		},
	},
	// Shell output minimizer
	"shellMinimizer.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "shell",
			group: "Bash",
			label: "Shell 精简器",
			description: "在将详细 shell 输出返回给代理前压缩（git、npm、cargo 等）",
		},
	},
	"shellMinimizer.settingsPath": {
		type: "string",
		default: undefined,
	},
	"shellMinimizer.only": { type: "array", default: EMPTY_STRING_ARRAY },
	"shellMinimizer.except": { type: "array", default: EMPTY_STRING_ARRAY },
	"shellMinimizer.maxCaptureBytes": {
		type: "number",
		default: 4 * 1024 * 1024,
	},
	"shellMinimizer.sourceOutlineLevel": {
		type: "enum",
		values: ["default", "aggressive"] as const,
		default: "default",
		ui: {
			tab: "shell",
			group: "Bash",
			label: "Shell 精简器源码大纲",
			description: "用于 cat/read 源码文件的源码大纲模式：默认或激进",
		},
	},
	"shellMinimizer.legacyFilters": {
		type: "boolean",
		default: undefined,
	},

	// Eval (per-backend toggles; add more as new backends ship, e.g. eval.ts)
	"eval.py": {
		type: "boolean",
		default: true,
		ui: {
			tab: "shell",
			group: "Eval 与运行时",
			label: "Python 评估后端",
			description: "允许 eval 工具将 Python 单元分派到 IPython 内核",
		},
	},

	"eval.js": {
		type: "boolean",
		default: true,
		ui: {
			tab: "shell",
			group: "Eval 与运行时",
			label: "JavaScript 评估后端",
			description: "允许 eval 工具将 JavaScript 单元分派到进程内运行时",
		},
	},

	"eval.rb": {
		type: "boolean",
		default: false,
		ui: {
			tab: "shell",
			group: "Eval 与运行时",
			label: "Ruby 评估后端",
			description: "允许 eval 工具将 Ruby 单元分派到持久 Ruby 内核",
		},
	},

	"eval.jl": {
		type: "boolean",
		default: false,
		ui: {
			tab: "shell",
			group: "Eval 与运行时",
			label: "Julia 评估后端",
			description: "允许 eval 工具将 Julia 单元分派到持久 Julia 内核",
		},
	},

	// Runtime knobs (consumed by eval backends and the /python slash command)
	"python.kernelMode": {
		type: "enum",
		values: ["session", "per-call"] as const,
		default: "session",
		ui: {
			tab: "shell",
			group: "Eval 与运行时",
			label: "Python 内核模式",
			description: "在 eval 调用之间保持 IPython 内核存活，或每次重新启动",
		},
	},
	"python.interpreter": {
		type: "string",
		default: "",
		ui: {
			tab: "shell",
			group: "Eval 与运行时",
			label: "Python 解释器",
			description:
				"指向精确 Python 可执行文件的可选路径。设置后，将跳过自动 Python 运行时发现。",
		},
	},
	"ruby.interpreter": {
		type: "string",
		default: "",
		ui: {
			tab: "shell",
			group: "Eval 与运行时",
			label: "Ruby 解释器",
			description:
				"指向精确 Ruby 可执行文件的可选路径。设置后，将跳过自动 Ruby 运行时发现。",
		},
	},
	"julia.interpreter": {
		type: "string",
		default: "",
		ui: {
			tab: "shell",
			group: "Eval 与运行时",
			label: "Julia 解释器",
			description:
				"指向精确 Julia 可执行文件的可选路径。设置后，将跳过自动 Julia 运行时发现。",
		},
	},

	// ────────────────────────────────────────────────────────────────────────
	// Tools
	// ────────────────────────────────────────────────────────────────────────

	// Tool approval policies
	"tools.approval": {
		type: "record",
		default: {},
		ui: {
			tab: "interaction",
			group: "审批",
			label: "工具审批策略",
			description:
				"每个工具的审批策略。设置为 'allow' 自动批准，'prompt' 要求确认，或 'deny' 阻止。在所有审批模式下都会遵循覆盖设置。",
		},
	},

	// Default tool approval mode (interaction tab, but governs the tool wrapper).
	//   "always-ask" — auto-approves read-tier tools only; prompts for write/exec.
	//   "write"      — auto-approves read and write-tier tools; prompts for exec.
	//   "yolo"       — auto-approves every tier.
	"tools.approvalMode": {
		type: "enum",
		values: ["always-ask", "write", "yolo"] as const,
		default: "yolo",
		ui: {
			tab: "interaction",
			group: "审批",
			label: "工具审批",
			description:
				"工具调用的默认审批行为。'Always ask' 仅自动批准只读工具。'Write' 自动批准读取和工作区写入工具。'Yolo' 自动批准所有级别；用户策略仍可能提示或阻止。",
			options: [
				{
					value: "always-ask",
					label: "始终询问",
					description: "自动批准只读工具；写和执行工具需要确认",
				},
				{
					value: "write",
					label: "写入",
					description:
						"自动批准只读和写入工具；对 bash、eval、browser 和 task 等 exec 工具要求确认。",
				},
				{
					value: "yolo",
					label: "Yolo",
					description:
						"自动批准读取、写入和 exec 工具。用户策略仍可要求确认或阻止调用。",
				},
			],
		},
	},

	// Todo tool
	"todo.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "待办",
			description: "启用 todo 工具进行任务跟踪",
		},
	},

	"todo.reminders": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "待办事项",
			label: "待办提醒",
			description: "提醒代理在停止前完成待办事项",
		},
	},

	"todo.remindersMax": {
		type: "number",
		default: 3,
		ui: {
			tab: "tools",
			group: "待办事项",
			label: "待办提醒上限",
			description: "放弃前最大待办提醒次数",
			options: [
				{ value: "1", label: "1 reminder" },
				{ value: "2", label: "2 reminders" },
				{ value: "3", label: "3 reminders" },
				{ value: "5", label: "5 reminders" },
			],
		},
	},

	"todo.eager": {
		type: "enum",
		values: ["default", "preferred", "always"] as const,
		default: "default",
		ui: {
			tab: "tools",
			group: "待办事项",
			label: "自动创建待办事项",
			description: "在第一条消息后推动自动创建待办事项列表的力度",
			options: [
				{ value: "default", label: "默认", description: "Model decides; no automatic todo list" },
				{
					value: "preferred",
					label: "首选",
					description: "在第一条消息上建议待办事项列表（提醒，不强制）",
				},
				{ value: "always", label: "始终", description: "Forces a comprehensive todo list on the first message" },
			],
		},
	},

	// Grep, glob, and AST tools
	"glob.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "Glob",
			description: "启用 glob 工具进行基于 glob 的文件查找",
		},
	},

	"grep.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "Grep",
			description: "启用 grep 工具进行正则表达式内容搜索",
		},
	},

	"grep.contextBefore": {
		type: "number",
		default: 1,
		ui: {
			tab: "tools",
			group: "Grep 与浏览器",
			label: "Grep 前上下文",
			description: "每个 grep 匹配前的上下文行数",
			options: [
				{ value: "0", label: "0 lines" },
				{ value: "1", label: "1 line" },
				{ value: "2", label: "2 lines" },
				{ value: "3", label: "3 lines" },
				{ value: "5", label: "5 lines" },
			],
		},
	},

	"grep.contextAfter": {
		type: "number",
		default: 3,
		ui: {
			tab: "tools",
			group: "Grep 与浏览器",
			label: "Grep 后上下文",
			description: "每个 grep 匹配后的上下文行数",
			options: [
				{ value: "0", label: "0 lines" },
				{ value: "1", label: "1 line" },
				{ value: "2", label: "2 lines" },
				{ value: "3", label: "3 lines" },
				{ value: "5", label: "5 lines" },
				{ value: "10", label: "10 lines" },
			],
		},
	},

	"astGrep.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "AST Grep",
			description: "启用 ast_grep 工具进行结构化 AST 搜索",
		},
	},

	"astEdit.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "AST Edit",
			description: "启用 ast_edit 工具进行结构化 AST 重写",
		},
	},

	// Optional tools

	"debug.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "调试",
			description: "启用 debug 工具进行基于 DAP 的调试",
		},
	},

	"launch.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "启动",
			description: "启用 launch 工具监督共享的长时间运行项目进程",
		},
	},

	"speechgen.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "语音生成",
			description: "启用 tts 工具进行设备端（Kokoro）或 xAI Grok Voice 语音文件合成",
		},
	},
	"generate_image.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "生成图像",
			description:
				"启用 generate_image 工具（文本到图像的生成和编辑）。当 tools.xdev 开启时，作为 xd:// 设备公开。",
		},
	},

	// Legacy boolean kept only for back-compat migration to `inspect_image.mode`
	// (see config/settings.ts). Hidden from UI.
	"inspect_image.enabled": {
		type: "boolean",
		default: false,
	},

	"inspect_image.mode": {
		type: "enum",
		values: ["auto", "on", "off"] as const,
		default: "auto",
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "检查图像",
			description:
				"控制 inspect_image 工具，该工具将图像理解委托给具备视觉能力的模型。'auto' 仅在当前活动模型缺乏原生图像输入时公开；'on' 始终公开；'off' 从不公开。",
			options: [
				{ value: "auto", label: "自动（仅无视觉模型）" },
				{ value: "on", label: "开启" },
				{ value: "off", label: "关闭" },
			],
		},
	},

	"computer.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "Computer",
			description: "启用可脚本化的宿主机桌面控制工具（截图、输入、辅助功能）",
		},
	},

	"computer.display": {
		type: "string",
		default: "all",
		ui: {
			tab: "tools",
			group: "计算机",
			label: "Computer 显示",
			description: "合成所有显示器或选择原生显示器 ID",
		},
	},

	"computer.maxWidth": {
		type: "number",
		default: 3840,
		ui: {
			tab: "tools",
			group: "计算机",
			label: "Computer 截图宽度",
			description: "最大合成截图宽度（像素）",
		},
	},

	"computer.maxHeight": {
		type: "number",
		default: 2400,
		ui: {
			tab: "tools",
			group: "计算机",
			label: "Computer 截图高度",
			description: "最大合成截图高度（像素）",
		},
	},

	"inspect_image.timeoutMs": {
		type: "number",
		default: 300_000,
		ui: {
			tab: "tools",
			group: "执行",
			label: "检查图像超时",
			description:
				"inspect_image 视觉模型调用的每次请求超时时间，以毫秒为单位。停滞的提供商会快速失败并返回超时错误，而不是阻塞直到手动中止。设置为 0 以禁用超时。",
			options: [
				{ value: "0", label: "禁用" },
				{ value: "60000", label: "1 minute" },
				{ value: "120000", label: "2 minutes" },
				{ value: "180000", label: "3 minutes" },
				{ value: "300000", label: "5 minutes" },
			],
		},
	},

	"checkpoint.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "检查点/回退",
			description: "启用 checkpoint 和 rewind 工具进行上下文检查点",
		},
	},

	// Fetching and browser
	"fetch.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "读取 URL",
			description: "允许 read 工具获取和处理 URL",
		},
	},

	"vault.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "Obsidian Vault",
			description:
				"启用 vault:// 内部 URL，通过 Obsidian CLI 读取和编辑 Obsidian vault 内容。禁用时，拒绝解析 vault://，并从系统提示中省略 vault:// 条目。",
		},
	},

	"github.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "GitHub CLI",
			description:
				"启用 github 工具（基于操作的调度，用于仓库、问题、拉取请求、差异、搜索、检出、推送和 Actions 监听工作流）",
		},
	},

	"github.cache.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "GitHub",
			label: "GitHub 视图缓存",
			description: "将渲染的 issue/PR 视图输出缓存到 ~/.omp/cache/github-cache.db，让重复读取免费",
		},
	},

	"github.cache.softTtlSec": {
		type: "number",
		default: 300,
		ui: {
			tab: "tools",
			group: "GitHub",
			label: "GitHub 缓存软 TTL",
			description:
				"在此时间窗口内，缓存的 issue/PR 视图行直接返回（秒；默认 5 分钟）",
		},
	},

	"github.cache.hardTtlSec": {
		type: "number",
		default: 604800,
		ui: {
			tab: "tools",
			group: "GitHub",
			label: "GitHub 缓存硬 TTL",
			description:
				"超过软 TTL 后，缓存行被返回并在后台刷新；超过硬 TTL 后，将被丢弃（秒；默认 7 天）",
		},
	},

	"web_search.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "网页搜索",
			description: "启用 web_search 工具获取实时网页结果",
		},
	},

	"security.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "安全",
			description:
				"启用 OMP 原生安全扫描规划、执行以及只读的 security:// 资源命名空间",
		},
	},

	"ask.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "Ask",
			description: "启用 ask 工具进行交互式用户提问",
		},
	},

	"browser.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "可用工具",
			label: "浏览器",
			description: "启用 browser 工具进行脚本化 Chromium 自动化（puppeteer）",
		},
	},

	"browser.cdpUrl": {
		type: "string",
		default: undefined,
		ui: {
			tab: "tools",
			group: "Grep 与浏览器",
			label: "Browser CDP URL",
			description:
				"默认 HTTP CDP 发现端点（例如 http://127.0.0.1:9222），用于附加到已运行的浏览器而不是启动新浏览器。工具调用中显式的 app.cdp_url 或 app.path 优先。",
		},
	},

	"browser.relay": {
		type: "boolean",
		default: false,
		ui: {
			tab: "tools",
			group: "Grep 与浏览器",
			label: "浏览器中继",
			description:
				"通过 omp 浏览器中继驱动你自己的 Chrome 标签页。安装一次扩展（`omp browser-relay install`）；当浏览器工具需要时，中继服务器会自动启动。优先于 Browser CDP URL；设置 PI_BROWSER_RELAY=0 或 PI_BROWSER_RELAY=1 可覆盖。",
		},
	},

	"browser.relayUrl": {
		type: "string",
		default: undefined,
		ui: {
			tab: "tools",
			group: "Grep 与浏览器",
			label: "浏览器中继 URL",
			description: "omp 浏览器中继端点 (默认 http://127.0.0.1:9224).",
		},
	},

	"browser.headless": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "Grep 与浏览器",
			label: "无头浏览器",
			description: "以无头模式启动浏览器 (禁用以显示浏览器界面)",
		},
	},

	"browser.cmux": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "Grep 与浏览器",
			label: "cmux 浏览器",
			description:
				"在可用 cmux 套接字时，使用 cmux WKWebView 表面进行浏览器自动化。设置 PI_BROWSER_CMUX=0 或 PI_BROWSER_CMUX=1 可覆盖。",
		},
	},
	"browser.screenshotDir": {
		type: "string",
		default: undefined,
		ui: {
			tab: "tools",
			group: "Grep 与浏览器",
			label: "截图目录",
			description:
				"用于保存截图的目录。如果未设置，截图将保存到临时文件。支持 ~。示例：~/Downloads、~/Desktop、/sdcard/Download（Android）。",
		},
	},

	// Tool execution
	"tools.intentTracing": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "执行",
			label: "意图追踪",
			description: "要求代理在执行每个工具调用前描述其意图",
		},
	},
	"tools.abortOnFabricatedResult": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "执行",
			label: "检测到伪造工具结果时中止",
			description:
				"对于带内工具调用，当模型在回合中途开始幻觉出一个工具结果时，立即停止模型。禁用则让模型完成生成，并丢弃虚构的继续内容。",
		},
	},

	"tools.maxTimeout": {
		type: "number",
		default: 0,
		ui: {
			tab: "tools",
			group: "执行",
			label: "最大工具超时",
			description: "代理可为任何工具设置的最大超时时间（秒）(0 = 无限制)",
			options: [
				{ value: "0", label: "无限制" },
				{ value: "30", label: "30 seconds" },
				{ value: "60", label: "60 seconds" },
				{ value: "120", label: "120 seconds" },
				{ value: "300", label: "5 minutes" },
				{ value: "600", label: "10 minutes" },
			],
		},
	},

	// Async jobs
	"async.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "执行",
			label: "异步执行",
			description: "启用异步 bash 命令和后台任务执行",
		},
	},

	"async.maxJobs": {
		type: "number",
		default: 100,
	},

	"async.pollWaitDuration": {
		type: "enum",
		values: ["5s", "10s", "30s", "1m", "5m", "smart"] as const,
		default: "smart",
		ui: {
			tab: "tools",
			group: "执行",
			label: "最大轮询时间",
			description:
				"`hub` wait 在返回当前状态前观察后台作业的时长。固定值每次等待该确切时长。`smart` 会自适应：从 5s 开始，随着连续 wait 逐步延长（最长 5m），然后在大约一分钟没有等待后重置为 5s。",
			options: [
				{ value: "5s", label: "5 seconds" },
				{ value: "10s", label: "10 seconds" },
				{ value: "30s", label: "30 seconds" },
				{ value: "1m", label: "1 minute" },
				{ value: "5m", label: "5 minutes" },
				{ value: "smart", label: "智能", description: "Default — adaptive 5s→5m, resets when you stop polling" },
			],
		},
	},

	"irc.timeoutMs": {
		type: "number",
		default: 120_000,
		ui: {
			tab: "tools",
			group: "执行",
			label: "IRC 超时",
			description:
				"hub 消息等待（以及 send await:true）的默认超时时间，单位毫秒；0 禁用超时。",
			options: [
				{ value: "0", label: "禁用" },
				{ value: "30000", label: "30 seconds" },
				{ value: "60000", label: "1 minute" },
				{ value: "120000", label: "2 minutes" },
				{ value: "300000", label: "5 minutes" },
			],
		},
	},

	"bash.autoBackground.thresholdMs": {
		type: "number",
		default: 60_000,
	},

	"tools.xdev": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "发现与 MCP",
			label: "xd:// 工具",
			description:
				"将很少使用（可发现）的工具挂载到 xd:// 设备 URL 下，通过读/写驱动，而不是在每次请求时发送其 schema。未授予写入工具的会话会跳过挂载，并在顶层暴露所有工具。禁用则将所有已启用的工具暴露在顶层。",
		},
	},

	"tools.xdevDocs": {
		type: "enum",
		values: ["inline", "builtins", "catalog"] as const,
		default: "builtins",
		ui: {
			tab: "tools",
			group: "发现与 MCP",
			label: "xd:// 提示词文档",
			description:
				"选择哪些挂载设备的文档和 schema 内联到系统提示中。Built-ins 将核心工具保持内联，而 MCP 和扩展工具保持按需。",
			options: [
				{ value: "inline", label: "全部设备", description: "Inline docs and schemas for every mounted device." },
				{
					value: "builtins",
					label: "仅内置",
					description: "内联内置文档；按需获取 MCP 和扩展文档。",
				},
				{ value: "catalog", label: "仅目录", description: "List every device; fetch all docs on demand." },
			],
		},
	},

	"tools.xdevInlineDevices": {
		type: "array",
		default: EMPTY_STRING_ARRAY,
		ui: {
			tab: "tools",
			group: "发现与 MCP",
			label: "xd:// 内联设备",
			description:
				"当 xd:// Prompt Docs 为 Built-ins Only 时，内联名称匹配这些 glob 模式的动态设备（例如 mcp__context_mode_*）。Catalog Only 会忽略此设置。",
		},
	},

	// MCP
	"mcp.enableProjectConfig": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "发现与 MCP",
			label: "MCP 项目配置",
			description: "从项目根目录加载 .mcp.json/mcp.json",
		},
	},

	"mcp.renderMarkdownResults": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "发现与 MCP",
			label: "MCP Markdown 结果",
			description: "在会话记录中将非 JSON 的 MCP 文本结果渲染为 Markdown",
		},
	},

	"mcp.notifications": {
		type: "boolean",
		default: false,
		ui: {
			tab: "tools",
			group: "发现与 MCP",
			label: "MCP 更新注入",
			description: "将 MCP 资源更新注入代理对话中",
		},
	},

	"mcp.notificationDebounceMs": {
		type: "number",
		default: 500,
		ui: {
			tab: "tools",
			group: "发现与 MCP",
			label: "MCP 通知防抖",
			description:
				"在将 MCP 资源更新注入对话之前的防抖窗口，单位毫秒。",
		},
	},

	// ────────────────────────────────────────────────────────────────────────
	// Tasks
	// ────────────────────────────────────────────────────────────────────────

	// Plan mode
	"plan.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tasks",
			group: "模式",
			label: "计划模式",
			description: "启用计划模式，以便在执行前进行只读探索和规划",
		},
	},

	"plan.defaultOnStartup": {
		type: "boolean",
		default: false,
		ui: {
			tab: "tasks",
			group: "模式",
			label: "以计划模式启动",
			description: "在每次新会话开始时自动进入计划模式",
			condition: "planModeEnabled",
		},
	},

	"goal.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tasks",
			group: "模式",
			label: "目标模式",
			description: "启用每会话目标模式和隐藏的目标工具",
		},
	},

	"goal.statusInFooter": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tasks",
			group: "模式",
			label: "页脚中的目标状态",
			description: "在状态行中的目标指示器旁显示 token 预算",
		},
	},

	"goal.continuationModes": {
		type: "array",
		default: ["interactive"],
		ui: {
			tab: "tasks",
			group: "模式",
			label: "目标延续模式",
			description: "允许活动目标在轮次间自动继续的运行模式",
		},
	},

	"title.refreshOnReplan": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tasks",
			group: "模式",
			label: "重新规划时刷新标题",
			description: "在待办初始化重新规划后刷新生成的会话标题，除非标题已由用户设置",
		},
	},

	// Delegation
	"task.isolation.mode": {
		type: "enum",
		values: [
			"none",
			"auto",
			"apfs",
			"btrfs",
			"zfs",
			"reflink",
			"overlayfs",
			"projfs",
			"block-clone",
			"rcopy",
		] as const,
		default: "none",
		ui: {
			tab: "tasks",
			group: "隔离",
			label: "隔离模式",
			description:
				'Isolation backend for subagents. "auto" lets the native PAL pick the best available backend (CoW-aware filesystems, then overlayfs/ProjFS, then a git worktree / recursive-copy fallback).',
			options: [
				{ value: "none", label: "无", description: "No isolation" },
				{ value: "auto", label: "自动", description: "Let the PAL pick the best available backend" },
				{ value: "apfs", label: "APFS", description: "macOS clonefile reflink (APFS)" },
				{ value: "btrfs", label: "btrfs", description: "btrfs subvolume snapshot" },
				{ value: "zfs", label: "ZFS", description: "ZFS snapshot + clone" },
				{ value: "reflink", label: "Reflink", description: "Linux FICLONE per-file reflink" },
				{
					value: "overlayfs",
					label: "Overlayfs",
					description: "Linux 内核 overlay (或 fuse-overlayfs 回退)",
				},
				{ value: "projfs", label: "ProjFS", description: "Windows Projected File System" },
				{
					value: "block-clone",
					label: "块克隆",
					description: "Windows FSCTL_DUPLICATE_EXTENTS_TO_FILE（NTFS/ReFS）",
				},
				{
					value: "rcopy",
					label: "递归复制",
					description: "使用 git worktree（如果可用），否则进行递归复制",
				},
			],
		},
	},

	"task.isolation.apply": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tasks",
			group: "隔离",
			label: "应用隔离更改",
			description:
				"自动将成功的隔离任务更改应用到父级检出；禁用则保留补丁或分支产物。",
		},
	},

	"task.isolation.merge": {
		type: "enum",
		values: ["patch", "branch"] as const,
		default: "patch",
		ui: {
			tab: "tasks",
			group: "隔离",
			label: "隔离合并策略",
			description: "隔离任务更改的集成方式 (应用补丁或合并分支)",
			options: [
				{ value: "patch", label: "补丁", description: "Combine diffs and git apply" },
				{ value: "branch", label: "分支", description: "Commit per task, merge with --no-ff" },
			],
		},
	},

	"task.isolation.commits": {
		type: "enum",
		values: ["generic", "ai"] as const,
		default: "generic",
		ui: {
			tab: "tasks",
			group: "隔离",
			label: "隔离提交风格",
			description: "嵌套仓库更改的提交消息风格 (通用或 AI 生成)",
			options: [
				{ value: "generic", label: "通用", description: "Static commit message" },
				{ value: "ai", label: "AI", description: "AI-generated commit message from diff" },
			],
		},
	},

	"worktree.base": {
		type: "string",
		default: undefined,
		ui: {
			tab: "tasks",
			group: "隔离",
			label: "Worktree 基础目录",
			description:
				"代理管理工作树的基础目录——任务隔离副本、`github` PR 检出和 `omp worktree` 清理都在此处。未设置时使用 ~/.omp/wt。必须是绝对路径或 ~ 相对路径；相对路径会被忽略。OMP_WORKTREE_DIR 环境变量会覆盖此设置。",
		},
	},

	"task.eager": {
		type: "enum",
		values: ["default", "preferred", "always"] as const,
		default: "default",
		ui: {
			tab: "tasks",
			group: "子代理",
			label: "优先任务委派",
			description: "在多大程度上推动将工作委派给子代理",
			options: [
				{ value: "default", label: "默认", description: "Model decides when to delegate" },
				{ value: "preferred", label: "优先", description: "Adds delegation guidance to the system prompt" },
				{ value: "always", label: "始终", description: "Prompt guidance plus a first-turn delegation reminder" },
			],
		},
	},

	"task.batch": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tasks",
			group: "子代理",
			label: "批量任务调用",
			description:
				"将任务工具切换为其批处理形态：一次调用携带 { context, tasks[] }——每个项目一个子代理，可选的按项目代理（默认为会话的 spawn-policy 代理）、按项目隔离，以及一个必须的共享上下文前置到每个任务。启用 async.enabled=true 时，每个 spawn 作为独立的后台代理运行，遵循正常的 idle/parked 生命周期；否则该调用会阻塞以等待合并结果。禁用则恢复为扁平的单 spawn schema。",
		},
	},

	"task.enableEffort": {
		type: "boolean",
		default: false,
		ui: {
			tab: "tasks",
			group: "子代理",
			label: "每任务工作量",
			description:
				"在任务 spawn 上暴露可选的 effort 参数，允许调用方覆盖每个子代理的思考级别。",
		},
	},

	"task.maxConcurrency": {
		type: "number",
		default: 32,
		ui: {
			tab: "tasks",
			group: "子代理",
			label: "最大并发任务数",
			description: "并发运行的子代理最大数量",
			options: [
				{ value: "0", label: "不限" },
				{ value: "1", label: "1 task" },
				{ value: "2", label: "2 tasks" },
				{ value: "4", label: "4 tasks" },
				{ value: "8", label: "8 tasks" },
				{ value: "16", label: "16 tasks" },
				{ value: "32", label: "32 tasks" },
				{ value: "64", label: "64 tasks" },
			],
		},
	},

	"task.enableLsp": {
		type: "boolean",
		default: false,
		ui: {
			tab: "tasks",
			group: "子代理",
			label: "子代理中的 LSP",
			description:
				"允许通过任务工具生成的子代理使用 lsp 工具。默认关闭以保持子代理开销低廉；当需要 LSP 感知的委派值得额外 token 时启用。",
		},
	},

	"task.maxRecursionDepth": {
		type: "number",
		default: 2,
		ui: {
			tab: "tasks",
			group: "子代理",
			label: "最大任务递归深度",
			description: "子代理可以向下生成自身子代理的最大层级数",
			options: [
				{ value: "-1", label: "不限" },
				{ value: "0", label: "无" },
				{ value: "1", label: "单层" },
				{ value: "2", label: "双层" },
				{ value: "3", label: "三层" },
			],
		},
	},

	"task.maxRuntimeMs": {
		type: "number",
		default: 0,
		ui: {
			tab: "tasks",
			group: "子代理",
			label: "子代理最大运行时间",
			description:
				"每个子代理的硬性墙钟时间上限（ms）。0 禁用。这是针对逃过推理层看门狗的提供方侧流挂起的纵深防御；会以 'timed out' 原因触发正常的子代理中止。",
			options: [
				{ value: "0", label: "不限", description: "默认" },
				{ value: "300000", label: "5 minutes" },
				{ value: "900000", label: "15 minutes" },
				{ value: "1800000", label: "30 minutes" },
				{ value: "3600000", label: "1 hour" },
			],
		},
	},

	"task.agentIdleTtlMs": {
		type: "number",
		default: 420_000,
		ui: {
			tab: "tasks",
			group: "子代理",
			label: "代理空闲 TTL",
			description:
				"空闲子代理在被暂存到磁盘前于内存中保持活动的时长（ms）。已暂存代理在收到消息或恢复时会自动唤醒。0 保持空闲代理活动直到退出。",
		},
	},

	"task.softRequestBudget": {
		type: "number",
		default: 200,
		ui: {
			tab: "tasks",
			group: "子代理",
			label: "子代理请求软预算",
			description:
				"每个子代理的软请求预算（每次运行的助手请求数）。超过预算时注入一条收尾引导通知（参见 task.softRequestBudgetNotice）；达到预算的 1.5 倍时，运行会被强制停止，代理必须提交其部分发现。0 禁用该保护。内置的 scout/sonic 代理在更低的固定预算处封顶，因此低于该上限的值仍然对它们生效。",
			options: [
				{ value: "0", label: "禁用" },
				{ value: "90", label: "90 requests" },
				{ value: "150", label: "150 requests" },
				{ value: "200", label: "200 requests", description: "默认" },
			],
		},
	},

	"task.softRequestBudgetNotice": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tasks",
			group: "子代理",
			label: "软请求预算通知",
			description:
				"当子代理超过其软请求预算时，注入一条引导通知，要求其在 1.5 倍强制让出停止前收尾。",
		},
	},

	"task.maxEffort": {
		type: "enum",
		values: THINKING_EFFORTS,
		default: "max",
		ui: {
			tab: "tasks",
			group: "子代理",
			label: "单次生成最大工作量",
			description:
				"任务工具每个 spawn 的 effort 提示所允许的最大推理强度。较低的值可防止调用方将子代理提升到此上限以上；默认值保留模型的完整范围。",
			options: THINKING_EFFORTS.map(getThinkingLevelMetadata),
		},
	},

	"task.disabledAgents": {
		type: "array",
		default: [] as string[],
	},

	"task.agentModelOverrides": {
		type: "record",
		default: DEFAULT_AGENT_MODEL_OVERRIDES,
	},
	"task.agentPrewalk": {
		type: "record",
		default: {} as Record<string, string>,
	},
	"task.agentAdvisor": {
		type: "record",
		default: {} as Record<string, string>,
	},
	"task.prewalk": {
		type: "boolean",
		default: false,
		ui: {
			tab: "tasks",
			group: "子代理",
			label: "通用任务预检",
			description:
				"为内置通用 `task` 子代理启用 prewalk：它在解析后的模型上启动，规划并开始实施，然后在首次编辑/写入时移交给 'smol' 角色。按代理的覆盖（task.agentPrewalk，从 /agents hub 配置）和用户代理 `prewalk` frontmatter 无论此开关如何都生效。",
		},
	},

	"tasks.todoClearDelay": {
		type: "number",
		default: 60,
		ui: {
			tab: "tools",
			group: "待办事项",
			label: "待办自动清除延迟",
			description: "已完成或已放弃的待办事项从待办组件中移除前的延迟时间",
			options: [
				{ value: "0", label: "立即" },
				{ value: "60", label: "1 minute", description: "默认" },
				{ value: "300", label: "5 minutes" },
				{ value: "900", label: "15 minutes" },
				{ value: "1800", label: "30 minutes" },
				{ value: "3600", label: "1 hour" },
				{ value: "-1", label: "从不" },
			],
		},
	},

	"task.showResolvedModelBadge": {
		type: "boolean",
		default: false,
		ui: {
			tab: "appearance",
			group: "显示",
			label: "显示已解析模型徽章",
			description: "在任务组件状态行中显示每个子代理实际使用的模型 ID",
		},
	},

	// Skills
	"skills.enabled": { type: "boolean", default: true },

	"skills.enableSkillCommands": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tasks",
			group: "命令与技能",
			label: "技能命令",
			description: "将技能注册为 /skill:name 命令",
		},
	},

	"skills.enableCodexUser": { type: "boolean", default: true },

	"skills.enableClaudeUser": { type: "boolean", default: true },

	"skills.enableClaudeProject": { type: "boolean", default: true },

	"skills.enablePiUser": { type: "boolean", default: true },

	"skills.enablePiProject": { type: "boolean", default: true },

	"skills.enableAgentsUser": { type: "boolean", default: true },

	"skills.enableAgentsProject": { type: "boolean", default: true },

	"skills.customDirectories": { type: "array", default: [] as string[] },

	"skills.ignoredSkills": { type: "array", default: [] as string[] },

	"skills.includeSkills": { type: "array", default: [] as string[] },

	// Commands
	"commands.enableClaudeUser": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tasks",
			group: "命令与技能",
			label: "Claude 用户命令",
			description: "从 ~/.claude/commands/ 加载命令",
		},
	},

	"commands.enableClaudeProject": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tasks",
			group: "命令与技能",
			label: "Claude 项目命令",
			description: "从 .claude/commands/ 加载命令",
		},
	},

	"commands.enableOpencodeUser": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tasks",
			group: "命令与技能",
			label: "OpenCode 用户命令",
			description: "从 ~/.config/opencode/commands/ 加载命令",
		},
	},

	"commands.enableOpencodeProject": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tasks",
			group: "命令与技能",
			label: "OpenCode 项目命令",
			description: "从 .opencode/commands/ 加载命令",
		},
	},

	// ────────────────────────────────────────────────────────────────────────
	// Providers
	// ────────────────────────────────────────────────────────────────────────

	// Secret handling
	"secrets.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "providers",
			group: "隐私",
			label: "隐藏密钥",
			description: "在发送给 AI 提供商之前，混淆已配置的密钥并遮蔽类似凭据的 token",
		},
	},

	// Provider selection
	"providers.ollama-cloud.maxConcurrency": {
		type: "number",
		default: 3,
		ui: {
			tab: "providers",
			group: "服务",
			label: "Ollama Cloud 最大并发",
			description:
				"每个进程的最大并发 Ollama Cloud 子代理运行数；0 禁用提供方特定限制。",
		},
	},
	"providers.webSearchOrder": {
		type: "array",
		default: [] as SearchProviderId[],
		ui: {
			tab: "providers",
			group: "服务",
			label: "Web Search 提供商顺序",
			description:
				"web_search 工具的优先提供方；未列出的提供方随后保持其默认顺序。",
			options: SEARCH_PROVIDER_CHOICES,
			ordered: true,
		},
	},
	"providers.webSearchExclude": {
		type: "array",
		default: [] as SearchProviderId[],
		ui: {
			tab: "providers",
			group: "服务",
			label: "排除的 Web Search 提供商",
			description: "web_search 即使作为回退也绝不能使用的提供商",
			options: SEARCH_PROVIDER_CHOICES,
		},
	},
	"providers.webSearchTimeoutSeconds": {
		type: "number",
		default: DEFAULT_WEB_SEARCH_TIMEOUT_SECONDS,
		ui: {
			tab: "providers",
			group: "服务",
			label: "Web Search 超时",
			description: `Hard timeout for each provider's search transport before web_search advances to the next fallback, in seconds (maximum ${MAX_WEB_SEARCH_TIMEOUT_SECONDS})`,
			options: [
				{ value: "30", label: "30 seconds" },
				{ value: "60", label: "1 minute" },
				{ value: "120", label: "2 minutes" },
				{ value: "180", label: "3 minutes" },
				{ value: "300", label: "5 minutes" },
			],
		},
	},
	"providers.webSearchGeminiModel": {
		type: "string",
		default: undefined,
		ui: {
			tab: "providers",
			group: "服务",
			label: "Gemini web_search 模型",
			description: "用于 Gemini Google Search grounding 的模型 ID。默认为 gemini-2.5-flash。",
		},
	},
	"providers.antigravityEndpoint": {
		type: "enum",
		values: ["auto", "production", "sandbox"] as const,
		default: "auto",
		ui: {
			tab: "providers",
			group: "服务",
			label: "Antigravity 端点模式",
			description: "端点路由策略，适用于 google-antigravity 提供商（聊天、搜索、图像、发现）",
			options: [
				{
					value: "auto",
					label: "自动",
					description: "尝试生产端点，在 5xx/429 时故障转移到沙盒",
				},
				{
					value: "production",
					label: "仅生产",
					description: "仅强制生产端点",
				},
				{
					value: "sandbox",
					label: "仅沙盒",
					description: "仅强制沙盒端点",
				},
			],
		},
	},
	"providers.imageOrder": {
		type: "array",
		default: [] as ImageProvider[],
		ui: {
			tab: "providers",
			group: "服务",
			label: "图像提供商顺序",
			description:
				"图像生成的优先提供方；未列出的提供方遵循当前会话提供方和内置顺序。",
			options: IMAGE_PROVIDER_CHOICES,
			ordered: true,
		},
	},
	"providers.fireworksTier": {
		type: "enum",
		values: ["standard", "priority"] as const,
		default: "standard",
		ui: {
			tab: "providers",
			group: "Fireworks",
			label: "Fireworks 层级",
			description:
				'Serving path for Fireworks requests. Priority sends `service_tier: "priority"` for higher reliability during peak traffic at a higher price; Standard omits it. Fast (`-fast`) models ignore this — Fast is its own serving path.',
			options: [
				{ value: "standard", label: "标准", description: "Default serving path (no service_tier)" },
				{
					value: "priority",
					label: "优先级",
					description: "优先服务路径：更高可靠性，token 单价更高",
				},
			],
		},
	},
	"live.voice": {
		type: "enum",
		values: LIVE_VOICE_VALUES,
		default: DEFAULT_LIVE_VOICE,
		ui: {
			tab: "providers",
			group: "服务",
			label: "实时语音",
			description: "Codex 支持的实时语音会话所使用的语音",
			options: LIVE_VOICE_OPTIONS,
		},
	},
	"providers.tts": {
		type: "enum",
		values: ["auto", "local", "xai"] as const,
		default: "auto",
		ui: {
			tab: "providers",
			group: "服务",
			label: "文本转语音提供商",
			description: "tts 工具的后端：本地设备端神经 TTS（Kokoro-82M）或 xAI Grok Voice",
			options: [
				{
					value: "auto",
					label: "自动",
					description: "优先使用本地设备端 TTS；存在凭据时将 .mp3 输出路由到 xAI",
				},
				{ value: "local", label: "本地", description: "On-device neural TTS (Kokoro-82M); output is WAV/PCM16" },
				{
					value: "xai",
					label: "xAI Grok Voice",
					description: "需要 xAI Grok OAuth 或 XAI_API_KEY；MP3 或 WAV",
				},
			],
		},
	},
	"tts.localModel": {
		type: "enum",
		values: TTS_LOCAL_MODEL_VALUES,
		default: DEFAULT_TTS_LOCAL_MODEL_KEY,
		ui: {
			tab: "providers",
			group: "服务",
			label: "Local TTS 模型",
			description: "本地 TTS 后端使用的设备端神经 TTS 模型（Kokoro-82M）",
			options: TTS_LOCAL_MODEL_OPTIONS,
		},
	},
	"tts.localVoice": {
		type: "enum",
		values: TTS_LOCAL_VOICE_VALUES,
		default: DEFAULT_TTS_VOICE,
		ui: {
			tab: "providers",
			group: "服务",
			label: "Local TTS 语音",
			description: "本地 TTS 后端使用的 Kokoro 语音（美式/英式，女声/男声）",
			options: TTS_LOCAL_VOICE_OPTIONS,
		},
	},
	"speech.enabled": {
		type: "boolean",
		default: false,
		ui: {
			tab: "providers",
			group: "服务",
			label: "语音发声",
			description: "在流式输出时，通过扬声器朗读助手的输出",
		},
	},
	"speech.mode": {
		type: "enum",
		values: ["all", "assistant", "yield"] as const,
		default: "assistant",
		ui: {
			tab: "providers",
			group: "服务",
			label: "语音发声模式",
			description:
				"要朗读的内容：all = 助手消息 + 思考；assistant = 仅消息；yield = 仅回合结束时的最终消息。",
			options: [
				{ value: "all", label: "全部（消息 + 思考）" },
				{ value: "assistant", label: "仅助手消息" },
				{ value: "yield", label: "仅最终消息" },
			],
		},
	},
	"speech.enhanced": {
		type: "boolean",
		default: false,
		ui: {
			tab: "providers",
			group: "服务",
			label: "增强语音重写",
			description:
				"在合成前使用 tiny/smol 模型将助手输出改写为自然的口语化散文（描述代码，去掉链接和 markdown）。失败时回退到机械清理。",
		},
	},
	"speech.voice": {
		type: "enum",
		values: TTS_LOCAL_VOICE_VALUES,
		default: DEFAULT_TTS_VOICE,
		ui: {
			tab: "providers",
			group: "服务",
			label: "语音发声语音",
			description: "朗读助手输出时使用的 Kokoro 语音",
			options: TTS_LOCAL_VOICE_OPTIONS,
		},
	},
	"providers.tinyModel": {
		type: "enum",
		values: TINY_TITLE_MODEL_VALUES,
		default: ONLINE_TINY_TITLE_MODEL_KEY,
		ui: {
			tab: "providers",
			group: "微型模型",
			label: "Tiny 模型",
			description:
				"会话标题模型：默认在线（来自 /models 的 TINY 角色，否则 @smol），或本地设备端模型。",
			options: TINY_TITLE_MODEL_OPTIONS,
		},
	},
	"providers.tinyModelDevice": {
		type: "enum",
		values: TINY_MODEL_DEVICE_SETTING_VALUES,
		default: TINY_MODEL_DEVICE_DEFAULT,
		ui: {
			tab: "providers",
			group: "微型模型",
			label: "Tiny 模型设备",
			description:
				"本地 tiny 模型（标题 + 记忆）的 ONNX 执行提供方。默认使用仅 CPU 推理。PI_TINY_DEVICE 环境变量会覆盖此设置。",
			options: TINY_MODEL_DEVICE_SETTING_OPTIONS,
		},
	},
	"providers.tinyModelDtype": {
		type: "enum",
		values: TINY_MODEL_DTYPE_SETTING_VALUES,
		default: TINY_MODEL_DTYPE_DEFAULT,
		ui: {
			tab: "providers",
			group: "微型模型",
			label: "Tiny 模型精度",
			description:
				"本地 tiny 模型的 ONNX 量化/精度。默认使用每个模型自带的 dtype（q4）；较低精度更快，较高精度更忠实。PI_TINY_DTYPE 环境变量会覆盖此设置。",
			options: TINY_MODEL_DTYPE_SETTING_OPTIONS,
		},
	},
	"providers.memoryModel": {
		type: "enum",
		values: TINY_MEMORY_MODEL_VALUES,
		default: ONLINE_MEMORY_MODEL_KEY,
		ui: {
			tab: "memory",
			group: "常规",
			label: "内存模型",
			description:
				"用于事实提取 + 整合的 Mnemopi LLM：默认在线（来自 /models 的 TINY 角色，否则 smol/remote），或本地设备端模型。",
			condition: "mnemopiActive",
			options: TINY_MEMORY_MODEL_OPTIONS,
		},
	},

	"providers.autoThinkingModel": {
		type: "enum",
		values: AUTO_THINKING_MODEL_VALUES,
		default: ONLINE_AUTO_THINKING_MODEL_KEY,
		ui: {
			tab: "model",
			group: "思考",
			label: "Auto 思考模型",
			description:
				"`auto` 思考级别的难度分类器：默认在线（来自 /models 的 TINY 角色，否则 smol），或本地设备端模型。",
			condition: "autoThinkingActive",
			options: AUTO_THINKING_MODEL_OPTIONS,
		},
	},
	"providers.autoThinkingMaxEffort": {
		type: "enum",
		values: ["xhigh", "max"] as const,
		default: "xhigh",
		ui: {
			tab: "model",
			group: "思考",
			label: "Auto 思考上限",
			description:
				"`auto` 分类器可解析到的最高 effort。`xhigh` 将分类器保持在最高档下一档，因此只有显式的 `ultrathink` 才能达到 `max`；`max` 允许分类器判定为例外的回合在暴露该档的模型上使用最高档。",
			condition: "autoThinkingActive",
			options: [
				{ value: "xhigh", label: "xhigh", description: "Classifier stops at xhigh (default)" },
				{ value: "max", label: "max", description: "Classifier may resolve max where the model supports it" },
			],
		},
	},
	"features.unexpectedStopDetection": {
		type: "boolean",
		default: false,
		ui: {
			tab: "interaction",
			group: "代理",
			label: "检测意外停止",
			description:
				"使用一个小模型来检测助手说它将继续但没有工具调用就停止的情况；自动提示它继续。",
		},
	},
	"providers.unexpectedStopModel": {
		type: "enum",
		values: TINY_MEMORY_MODEL_VALUES,
		default: ONLINE_MEMORY_MODEL_KEY,
		ui: {
			tab: "providers",
			group: "微型模型",
			label: "意外停止模型",
			description:
				"用于意外停止检测的分类器：默认在线（来自 /models 的 TINY 角色，否则 smol），或本地设备端模型。",
			condition: "unexpectedStopDetection",
			options: TINY_MEMORY_MODEL_OPTIONS,
		},
	},

	"providers.kimiApiFormat": {
		type: "enum",
		values: ["auto", "openai", "anthropic"] as const,
		default: "auto",
		ui: {
			tab: "providers",
			group: "协议",
			label: "Kimi API 格式",
			description: "Kimi Code 提供商的 API 格式（自动跟随实时模型元数据）",
			options: [
				{ value: "auto", label: "自动", description: "Use the model's server-declared protocol" },
				{ value: "openai", label: "OpenAI", description: "api.kimi.com" },
				{ value: "anthropic", label: "Anthropic", description: "api.moonshot.ai" },
			],
		},
	},

	"providers.openaiWebsockets": {
		type: "enum",
		values: ["auto", "off", "on"] as const,
		default: "auto",
		ui: {
			tab: "providers",
			group: "协议",
			label: "OpenAI WebSockets",
			description: "OpenAI Codex 模型的 WebSocket 策略（auto 使用模型默认值，on 强制启用，off 禁用）",
			options: [
				{ value: "auto", label: "自动", description: "Use model/provider default websocket behavior" },
				{ value: "off", label: "关闭", description: "Disable websockets for OpenAI Codex models" },
				{ value: "on", label: "开启", description: "Force websockets for OpenAI Codex models" },
			],
		},
	},

	"providers.streamFirstEventTimeoutSeconds": {
		type: "number",
		default: -1,
		ui: {
			tab: "providers",
			group: "超时",
			label: "流式首个事件超时",
			description:
				"等待第一个模型流事件的秒数；-1 使用提供方/环境默认值，0 禁用看门狗。",
			options: [
				{ value: "-1", label: "自动", description: "Use provider defaults and PI_* timeout env vars" },
				{ value: "0", label: "关闭", description: "Disable first-event timeout" },
				{ value: "300", label: "5 minutes" },
				{ value: "600", label: "10 minutes" },
				{ value: "1800", label: "30 minutes" },
			],
		},
	},

	"providers.streamIdleTimeoutSeconds": {
		type: "number",
		default: -1,
		ui: {
			tab: "providers",
			group: "超时",
			label: "流式空闲超时",
			description:
				"模型流在事件之间允许静默的秒数；-1 使用提供方/环境默认值，0 禁用看门狗。",
			options: [
				{ value: "-1", label: "自动", description: "Use provider defaults and PI_* timeout env vars" },
				{ value: "0", label: "关闭", description: "Disable idle timeout" },
				{ value: "300", label: "5 minutes" },
				{ value: "600", label: "10 minutes" },
				{ value: "1800", label: "30 minutes" },
			],
		},
	},

	"providers.openrouterVariant": {
		type: "enum",
		values: ["default", "nitro", "floor", "online", "exacto"] as const,
		default: "default",
		ui: {
			tab: "providers",
			group: "协议",
			label: "OpenRouter 路由",
			description:
				"默认附加到 OpenRouter 模型 ID 的路由变体后缀（当选择器已命名变体时被覆盖）。",
			options: [
				{ value: "default", label: "默认", description: "No suffix; use OpenRouter's default routing" },
				{ value: "nitro", label: ":nitro", description: "Prioritize throughput / lowest latency" },
				{ value: "floor", label: ":floor", description: "Prioritize cheapest available provider" },
				{ value: "online", label: ":online", description: "Enable OpenRouter's web-search plugin" },
				{
					value: "exacto",
					label: ":exacto",
					description: "精选的高质量提供商（仅针对特定模型定义）",
				},
			],
		},
	},
	"providers.fetch": {
		type: "enum",
		values: ["auto", "native", "trafilatura", "lynx", "parallel", "jina"] as const,
		default: "auto",
		ui: {
			tab: "providers",
			group: "服务",
			label: "Fetch 提供商",
			description: "fetch/read URL 工具的读取器后端优先级",
			options: [
				{
					value: "auto",
					label: "自动",
					description: "优先级：native > trafilatura > lynx > parallel > jina",
				},
				{ value: "native", label: "原生", description: "In-process HTML→Markdown converter (always available)" },
				{ value: "trafilatura", label: "Trafilatura", description: "Auto-installs via uv/pip" },
				{ value: "lynx", label: "Lynx", description: "Requires lynx system package" },
				{ value: "parallel", label: "并行", description: "Requires PARALLEL_API_KEY" },
				{ value: "jina", label: "Jina", description: "Uses r.jina.ai reader (JINA_API_KEY optional)" },
			],
		},
	},
	// Codex saved rate-limit resets (auto-redeem)
	"codexResets.autoRedeem": {
		type: "enum",
		values: ["unset", "yes", "no"] as const,
		default: "unset" as const,
		ui: {
			tab: "providers",
			group: "服务",
			label: "Codex 自动兑换已保存的重置次数",
			description:
				"自动消耗已保存的 Codex 速率限制重置：当 5 小时或每周窗口耗尽导致账户被阻止、回合卡住且没有其他账户可以接管时，恢复该账户；并抢救即将过期的额度。unset 在首次消耗前询问，yes 直接消耗而不提示，no 禁用这两项检查。",
			options: [
				{
					value: "unset",
					label: "未设置",
					description: "检查资格，然后在消耗第一个已保存的重置次数之前询问。",
				},
				{ value: "yes", label: "是", description: "Spend eligible saved resets without prompting." },
				{ value: "no", label: "否", description: "Do not run the saved-reset auto-redeem check." },
			],
		},
	},
	"codexResets.minBlockedMinutes": {
		type: "number",
		default: 60,
		ui: {
			tab: "providers",
			group: "服务",
			label: "Codex 自动兑换最小区块",
			description:
				"仅当自然解除阻塞——已耗尽的 5h/每周窗口中最新的重置——至少在这么多分钟之后才自动赎回（不要为了节省短暂等待而消耗稀缺额度）。提高该值（例如 360）可忽略仅 5 小时的阻塞。",
		},
	},
	"codexResets.keepCredits": {
		type: "number",
		default: 0,
		ui: {
			tab: "providers",
			group: "服务",
			label: "Codex 自动兑换保留",
			description:
				"当已保存的重置数量低于此值时绝不自动消耗（0 = 最后一个额度也可能被自动花费）。即将过期的额度例外——保留的额度若过期则什么也保不住。",
		},
	},
	"codexResets.salvageHorizonHours": {
		type: "number",
		default: 12,
		ui: {
			tab: "providers",
			group: "服务",
			label: "Codex 重置救助时限",
			description:
				"当已保存的 Codex 重置将在这么多小时内过期，并且任一聊天窗口（5h 或每周）有实际用量需要恢复时，自动消耗它（0 禁用过期抢救）。",
		},
	},
	"provider.appendOnlyContext": {
		type: "enum",
		values: ["auto", "on", "off"] as const,
		default: "auto",
		ui: {
			tab: "providers",
			group: "协议",
			label: "仅追加上下文",
			description:
				"缓存系统提示 + 工具规格，并保持仅追加的消息日志，使提供方前缀缓存（DeepSeek、Xiaomi/SGLang、Anthropic）以最高命中率生效。Auto 为已知前缀缓存提供方自动启用。",
			options: [
				{ value: "auto", label: "自动", description: "Enable for known prefix-cache providers (recommended)" },
				{ value: "on", label: "开启", description: "Always enable append-only context" },
				{ value: "off", label: "关闭", description: "Disable append-only context" },
			],
		},
	},

	// Exa
	"exa.enabled": {
		type: "boolean",
		default: true,
		ui: {
			tab: "providers",
			group: "服务",
			label: "Exa",
			description: "启用 Exa Web 搜索提供商",
		},
	},

	"exa.searchDelayMs": {
		type: "number",
		default: 1_000,
		ui: {
			tab: "providers",
			group: "服务",
			label: "Exa 搜索延迟",
			description: "Exa Web 搜索请求之间的最小延迟（毫秒）；设为 0 以禁用限速",
		},
	},

	// SearXNG
	"searxng.endpoint": {
		type: "string",
		default: undefined,
		ui: {
			tab: "providers",
			group: "服务",
			label: "SearXNG 端点",
			description: "用于 Web 搜索的自托管 SearXNG 实例的基础 URL",
		},
	},

	"searxng.token": {
		type: "string",
		default: undefined,
		credential: true,
	},

	"searxng.basicUsername": {
		type: "string",
		default: undefined,
	},

	"searxng.basicPassword": {
		type: "string",
		default: undefined,
		credential: true,
	},

	"searxng.categories": {
		type: "string",
		default: undefined,
	},

	"searxng.engines": {
		type: "string",
		default: undefined,
	},

	"searxng.language": {
		type: "string",
		default: undefined,
	},

	"searxng.safesearch": {
		type: "number",
		default: undefined,
	},

	"commit.mapReduceEnabled": { type: "boolean", default: true },

	"commit.mapReduceMinFiles": { type: "number", default: 4 },

	"commit.mapReduceMaxFileTokens": { type: "number", default: 50000 },

	"commit.mapReduceTimeoutMs": { type: "number", default: 120000 },

	"commit.mapReduceMaxConcurrency": { type: "number", default: 5 },

	"commit.changelogMaxDiffChars": { type: "number", default: 120000 },

	"extensionHandlers.toolCallTimeoutMs": {
		type: "number",
		default: 30_000,
		ui: {
			tab: "tools",
			group: "扩展",
			label: "工具调用处理器超时（毫秒）",
			description:
				"扩展 tool_call 处理程序的正有限活动超时；无效值使用 30000ms，等待 OMP 拥有的对话框的时间不计入。",
		},
	},

	"dev.autoqa": {
		type: "boolean",
		default: true,
		ui: {
			tab: "tools",
			group: "开发者",
			label: "Auto QA",
			description:
				"自动化工具问题报告（xd://report_issue）。默认开启；第一次报告会征求同意，拒绝后禁用报告，直到显式重新启用。",
		},
	},

	"dev.autoqaPush.endpoint": {
		type: "string",
		default: "https://qa.omp.sh/v1/grievances" as const,
		ui: {
			tab: "tools",
			group: "开发者",
			label: "Auto QA 推送端点",
			description: "接收 Auto QA JSON 报告的完整 URL（默认 https://qa.omp.sh/v1/grievances）",
		},
	},

	"dev.autoqaPush.token": {
		type: "string",
		default: undefined,
		credential: true,
	},

	/**
	 * User decision on sharing automatic `report_tool_issue` grievances.
	 *
	 *   - `"unset"`  — never asked; the first `report_tool_issue` invocation
	 *                  pops a consent dialog and persists the answer here.
	 *   - `"granted"` — record and (when push is configured) ship grievances.
	 *   - `"denied"`  — silently no-op every `report_tool_issue` call.
	 *
	 * Owned by `packages/coding-agent/src/tools/report-tool-issue.ts` via the
	 * process-global consent handler registered by `InteractiveMode`.
	 *
	 * @default "unset"
	 */
	"dev.autoqaConsent": {
		type: "enum",
		values: ["unset", "granted", "denied"] as const,
		default: "unset" as const,
	},

	"gc.blobs": { type: "boolean", default: true },

	"gc.archive": { type: "boolean", default: true },

	"gc.wal": { type: "boolean", default: true },

	"gc.coldArchiveAfterDays": { type: "number", default: 30 },

	"gc.retainNewestGlobal": { type: "number", default: 20 },

	"gc.retainNewestPerCwd": { type: "number", default: 10 },

	"thinkingBudgets.minimal": { type: "number", default: 1024 },

	"thinkingBudgets.low": { type: "number", default: 2048 },

	"thinkingBudgets.medium": { type: "number", default: 8192 },

	"thinkingBudgets.high": { type: "number", default: 16384 },

	"thinkingBudgets.xhigh": { type: "number", default: 32768 },

	"thinkingBudgets.max": { type: "number", default: 32768 },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Type Inference
// ═══════════════════════════════════════════════════════════════════════════

type Schema = typeof SETTINGS_SCHEMA;

/** All valid setting paths */
export type SettingPath = keyof Schema;

/** Infer the value type for a setting path */
export type SettingValue<P extends SettingPath> = Schema[P] extends { type: "boolean"; default: undefined }
	? boolean | undefined
	: Schema[P] extends { type: "boolean" }
		? boolean
		: Schema[P] extends { type: "string" }
			? string | undefined
			: Schema[P] extends { type: "number"; default: undefined }
				? number | undefined
				: Schema[P] extends { type: "number" }
					? number
					: Schema[P] extends { type: "enum"; values: infer V }
						? V extends readonly string[]
							? V[number]
							: never
						: Schema[P] extends { type: "array"; default: infer D }
							? D
							: Schema[P] extends { type: "record"; default: infer D }
								? D
								: never;

/** Get the default value for a setting path */
export function getDefault<P extends SettingPath>(path: P): SettingValue<P> {
	return SETTINGS_SCHEMA[path].default as SettingValue<P>;
}

/** Check if a path has UI metadata (should appear in settings panel) */
export function hasUi(path: SettingPath): boolean {
	return "ui" in SETTINGS_SCHEMA[path];
}

/**
 * Whether a setting holds a credential and must never be printed or exported
 * without an explicit request. Drives both CLI redaction and settings-panel
 * masking, so the two cannot disagree.
 */
export function isCredential(path: SettingPath): boolean {
	const def = SETTINGS_SCHEMA[path];
	if ("credential" in def && def.credential === true) return true;
	// `ui.secret` predates this marker and still means "never display". Reading
	// both here keeps ONE accessor, so the two spellings cannot produce
	// different behaviour on different surfaces.
	return getUi(path)?.secret === true;
}

/** Get UI metadata for a path (undefined if no UI) */
export function getUi(path: SettingPath): AnyUiMetadata | undefined {
	const def = SETTINGS_SCHEMA[path];
	return "ui" in def ? (def.ui as AnyUiMetadata) : undefined;
}

/** Get all paths for a specific tab */
export function getPathsForTab(tab: SettingTab): SettingPath[] {
	return (Object.keys(SETTINGS_SCHEMA) as SettingPath[]).filter(path => {
		const ui = getUi(path);
		return ui?.tab === tab;
	});
}

/** Get the type of a setting */
export function getType(path: SettingPath): SettingDef["type"] {
	return SETTINGS_SCHEMA[path].type;
}

/** Get enum values for an enum setting */
export function getEnumValues(path: SettingPath): readonly string[] | undefined {
	const def = SETTINGS_SCHEMA[path];
	return "values" in def ? (def.values as readonly string[]) : undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// Derived Types from Schema
// ═══════════════════════════════════════════════════════════════════════════

/** Status line preset - derived from schema */
export type StatusLinePreset = SettingValue<"statusLine.preset">;

/** Status line separator style - derived from schema */
export type StatusLineSeparatorStyle = SettingValue<"statusLine.separator">;

/** Tree selector filter mode - derived from schema */
export type TreeFilterMode = SettingValue<"treeFilterMode">;

/** Personality preset - derived from schema */
export type Personality = SettingValue<"personality">;

// ═══════════════════════════════════════════════════════════════════════════
// Typed Group Definitions
// ═══════════════════════════════════════════════════════════════════════════

export interface CompactionSettings {
	enabled: boolean;
	strategy: "context-full" | "handoff" | "shake" | "snapcompact" | "off";
	thresholdPercent: number;
	thresholdTokens: number;
	reserveTokens: number | undefined;
	keepRecentTokens: number;
	midTurnEnabled: boolean;
	handoffSaveToDisk: boolean;
	autoContinue: boolean;
	remoteEnabled: boolean;
	remoteEndpoint: string | undefined;
	remoteStreamingV2Enabled: boolean;
	v2RetainedMessageBudget: number;
	idleEnabled: boolean;
	idleThresholdTokens: number;
	idleTimeoutSeconds: number;
	supersedeReads: boolean;
	dropUseless: boolean;
}

export interface RecapSettings {
	enabled: boolean;
	idleSeconds: number;
}

export interface TitleSettings {
	refreshOnReplan: boolean;
}

export interface ContextPromotionSettings {
	enabled: boolean;
}
export interface RetrySettings {
	enabled: boolean;
	maxRetries: number;
	baseDelayMs: number;
	maxDelayMs: number;
	modelFallback: boolean;
	usageAwareFallback: boolean;
	usageReservePct: number;
	usageReservePolicy: "confirm" | "auto" | "fail-closed";
}

export interface MemoriesSettings {
	enabled: boolean;
	maxRolloutsPerStartup: number;
	maxRolloutAgeDays: number;
	minRolloutIdleHours: number;
	threadScanLimit: number;
	maxRawMemoriesForGlobal: number;
	stage1Concurrency: number;
	stage1LeaseSeconds: number;
	stage1RetryDelaySeconds: number;
	phase2LeaseSeconds: number;
	phase2RetryDelaySeconds: number;
	phase2HeartbeatSeconds: number;
	rolloutPayloadPercent: number;
	fallbackTokenLimit: number;
	summaryInjectionTokenLimit: number;
}

export interface TodoCompletionSettings {
	enabled: boolean;
	maxReminders: number;
}

export interface BranchSummarySettings {
	enabled: boolean;
	reserveTokens: number;
}

export interface SkillsSettings {
	enabled?: boolean;
	enableSkillCommands?: boolean;
	enableCodexUser?: boolean;
	enableClaudeUser?: boolean;
	enableClaudeProject?: boolean;
	enablePiUser?: boolean;
	enablePiProject?: boolean;
	enableAgentsUser?: boolean;
	enableAgentsProject?: boolean;
	customDirectories?: string[];
	ignoredSkills?: string[];
	includeSkills?: string[];
	disabledExtensions?: string[];
}

export interface CommitSettings {
	mapReduceEnabled: boolean;
	mapReduceMinFiles: number;
	mapReduceMaxFileTokens: number;
	mapReduceTimeoutMs: number;
	mapReduceMaxConcurrency: number;
	changelogMaxDiffChars: number;
}

export interface TtsrSettings {
	enabled: boolean;
	contextMode: "discard" | "keep";
	interruptMode: "never" | "prose-only" | "tool-only" | "always";
	repeatMode: "once" | "after-gap";
	repeatGap: number;
	/** Bucketing-only (read by bucketRules, not the TtsrManager). */
	builtinRules?: boolean;
	/** Bucketing-only (read by bucketRules, not the TtsrManager). */
	disabledRules?: string[];
}

export interface ExaSettings {
	enabled: boolean;
	searchDelayMs: number;
}

export interface StatusLineSettings {
	preset: StatusLinePreset;
	separator: StatusLineSeparatorStyle;
	showHookStatus: boolean;
	leftSegments: StatusLineSegmentId[];
	rightSegments: StatusLineSegmentId[];
	segmentOptions: Record<string, unknown>;
}

export interface ThinkingBudgetsSettings {
	minimal: number;
	low: number;
	medium: number;
	high: number;
	xhigh: number;
	max: number;
}

export interface SttSettings {
	enabled: boolean;
	language: string | undefined;
	modelName: string;
	streaming: boolean;
}

export interface BashInterceptorRule {
	pattern: string;
	flags?: string;
	tool: string;
	message: string;
	allowSubcommands?: string[];
}

export interface ShellMinimizerSettings {
	enabled: boolean;
	settingsPath: string | undefined;
	only: string[];
	except: string[];
	maxCaptureBytes: number;
	sourceOutlineLevel: "default" | "aggressive";
	legacyFilters: boolean | undefined;
}
export type CodexAutoRedeemMode = "unset" | "yes" | "no";

export interface CodexResetsSettings {
	autoRedeem: CodexAutoRedeemMode;
	minBlockedMinutes: number;
	keepCredits: number;
	salvageHorizonHours: number;
}

export interface GcSettings {
	blobs: boolean;
	archive: boolean;
	wal: boolean;
	coldArchiveAfterDays: number;
	retainNewestGlobal: number;
	retainNewestPerCwd: number;
}

/** Map group prefix -> typed settings interface */
export interface GroupTypeMap {
	compaction: CompactionSettings;
	recap: RecapSettings;
	title: TitleSettings;
	contextPromotion: ContextPromotionSettings;
	retry: RetrySettings;
	memories: MemoriesSettings;
	branchSummary: BranchSummarySettings;
	skills: SkillsSettings;
	commit: CommitSettings;
	ttsr: TtsrSettings;
	exa: ExaSettings;
	statusLine: StatusLineSettings;
	thinkingBudgets: ThinkingBudgetsSettings;
	stt: SttSettings;
	modelRoles: Record<string, string>;
	modelTags: ModelTagsSettings;
	cycleOrder: string[];
	shellMinimizer: ShellMinimizerSettings;
	codexResets: CodexResetsSettings;
	gc: GcSettings;
}

export type GroupPrefix = keyof GroupTypeMap;
