/**
 * Plugin registry for managing editor plugins.
 * @package @xy-editor/core
 * @module plugins/PluginRegistry
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Interface representing an editor plugin.
 *
 * Use the generic TConfig parameter to type plugin-specific configuration
 * instead of using an index signature, which would disable TypeScript's
 * property checking.
 *
 * @example
 * ```typescript
 * interface LinkPluginConfig { defaultTarget?: '_blank' | '_self' }
 * const linkPlugin: EditorPlugin<LinkPluginConfig> = {
 *   name: 'link',
 *   config: { defaultTarget: '_blank' },
 * };
 * ```
 */
export interface EditorPlugin<TConfig = unknown> {
    /** Unique name — used as the registry key. Must be non-empty. */
    readonly name: string;
    /** Semver version string for debugging and compatibility checks */
    readonly version?: string;
    /**
     * Called when the plugin is registered.
     * If async, the registry awaits completion before marking plugin as ready.
     */
    init?: () => void | Promise<void>;
    /**
     * Called when the plugin is unregistered or the registry is cleared.
     * If async, the registry awaits completion before removing the plugin.
     */
    destroy?: () => void | Promise<void>;
    /** Typed plugin-specific configuration */
    readonly config?: TConfig;
}

/**
 * Metadata stored internally alongside each plugin.
 */
interface PluginEntry {
    plugin: Readonly<EditorPlugin>;
    /** Insertion index — preserved for ordered iteration */
    order: number;
    /** Unix timestamp when the plugin was registered */
    registeredAt: number;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * Registry for managing editor plugins.
 *
 * All mutating operations (register, unregister, clear) are async to allow
 * plugins to perform async initialization and cleanup.
 *
 * @example
 * ```typescript
 * const registry = new PluginRegistry();
 * await registry.register({ name: 'bold', init: async () => { ... } });
 * const plugin = registry.getByName('bold');
 * ```
 */
export class PluginRegistry {
    private readonly entries: Map<string, PluginEntry> = new Map();
    private orderCounter = 0;

    // ─── Write Operations ─────────────────────────────────────────────────────

    /**
     * Registers a plugin and awaits its initialization.
     *
     * @throws {Error} If the plugin name is empty or whitespace
     * @throws {Error} If a plugin with the same name is already registered
     * @throws {Error} If the plugin's init() throws or rejects
     */
    async register(plugin: EditorPlugin): Promise<void> {
        const name = plugin.name?.trim();

        if (!name) {
            throw new Error(
                `[PluginRegistry] Plugin name cannot be empty or whitespace.`
            );
        }

        if (this.entries.has(name)) {
            throw new Error(
                `[PluginRegistry] Plugin '${name}' is already registered. ` +
                `Call unregister('${name}') first if you intend to replace it.`
            );
        }

        // Await init before storing — plugin is not available until ready
        if (plugin.init) {
            await plugin.init();
        }

        this.entries.set(name, {
            plugin: Object.freeze({ ...plugin }), // freeze to prevent external mutation
            order: this.orderCounter++,
            registeredAt: Date.now(),
        });
    }

    /**
     * Unregisters a plugin by name, awaiting its cleanup.
     *
     * @throws {Error} If no plugin with the given name is registered
     */
    async unregister(name: string): Promise<void> {
        const entry = this.entries.get(name);

        if (!entry) {
            throw new Error(
                `[PluginRegistry] Cannot unregister '${name}' — no plugin with that name is registered.`
            );
        }

        // Await destroy before removing — ensures cleanup completes first
        if (entry.plugin.destroy) {
            await entry.plugin.destroy();
        }

        this.entries.delete(name);
    }

    /**
     * Unregisters all plugins in reverse registration order.
     * Reverse order ensures plugins that depend on others are torn down first.
     *
     * Errors during individual plugin destroy are collected and rethrown
     * together after all plugins have been processed, so one failing plugin
     * does not prevent others from cleaning up.
     */
    async clear(): Promise<void> {
        // Reverse registration order for teardown
        const allEntries = Array.from(this.entries.values())
            .sort((a, b) => b.order - a.order);

        const errors: Array<{ name: string; error: unknown }> = [];

        for (const entry of allEntries) {
            if (entry.plugin.destroy) {
                try {
                    await entry.plugin.destroy();
                } catch (error) {
                    errors.push({ name: entry.plugin.name, error });
                }
            }
            this.entries.delete(entry.plugin.name);
        }

        if (errors.length > 0) {
            const summary = errors
                .map(({ name, error }) =>
                    `  - '${name}': ${error instanceof Error ? error.message : String(error)}`
                )
                .join('\n');
            throw new Error(
                `[PluginRegistry] ${errors.length} plugin(s) failed during clear:\n${summary}`
            );
        }
    }

    // ─── Read Operations ──────────────────────────────────────────────────────

    /**
     * Returns all registered plugins in registration order.
     * Returns frozen copies — plugins cannot be mutated via this array.
     */
    getAll(): ReadonlyArray<Readonly<EditorPlugin>> {
        return Array.from(this.entries.values())
            .sort((a, b) => a.order - b.order)
            .map((entry) => entry.plugin);
    }

    /**
     * Returns a plugin by name, or undefined if not registered.
     */
    getByName(name: string): Readonly<EditorPlugin> | undefined {
        return this.entries.get(name)?.plugin;
    }

    /**
     * Returns whether a plugin with the given name is registered.
     */
    has(name: string): boolean {
        return this.entries.has(name);
    }

    /**
     * Returns the number of registered plugins.
     */
    get size(): number {
        return this.entries.size;
    }
}