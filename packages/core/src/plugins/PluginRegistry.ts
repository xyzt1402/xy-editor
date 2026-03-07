/**
 * Plugin registry for managing editor plugins.
 * @package @xy-editor/core
 * @module plugins/PluginRegistry
 */

/**
 * Interface representing an editor plugin.
 */
export interface EditorPlugin {
    /** Unique name of the plugin */
    name: string;
    /** Optional version string */
    version?: string;
    /** Optional initialization function called when plugin is registered */
    init?: () => void | Promise<void>;
    /** Optional cleanup function called when plugin is unregistered */
    destroy?: () => void | Promise<void>;
    /** Additional plugin-specific configuration */
    [key: string]: unknown;
}

/**
 * Registry for managing editor plugins.
 * 
 * Provides methods to register, retrieve, and manage plugins.
 * 
 * @example
 * ```typescript
 * const registry = new PluginRegistry();
 * 
 * registry.register({
 *   name: 'myPlugin',
 *   version: '1.0.0',
 *   init: () => { console.log('Plugin initialized'); }
 * });
 * 
 * const plugins = registry.getAll();
 * const plugin = registry.getByName('myPlugin');
 * ```
 */
export class PluginRegistry {
    /**
     * Internal storage for registered plugins.
     */
    private plugins: Map<string, EditorPlugin> = new Map();

    /**
     * Registers a plugin with the registry.
     * 
     * @param plugin - The plugin to register
     * @throws Error if a plugin with the same name is already registered
     * 
     * @example
     * ```typescript
     * registry.register({
     *   name: 'bold',
     *   init: () => { /* setup *\/ }
     * });
     * ```
     */
    register(plugin: EditorPlugin): void {
        if (!plugin.name) {
            throw new Error('Plugin must have a name');
        }

        if (this.plugins.has(plugin.name)) {
            throw new Error(`Plugin with name '${plugin.name}' is already registered`);
        }

        // Call the plugin's init function if provided
        if (plugin.init) {
            const result = plugin.init();
            // Handle async initialization
            if (result instanceof Promise) {
                result.catch((error) => {
                    console.error(`Failed to initialize plugin '${plugin.name}':`, error);
                });
            }
        }

        this.plugins.set(plugin.name, plugin);
    }

    /**
     * Retrieves all registered plugins.
     * 
     * @returns An array of all registered plugins
     * 
     * @example
     * ```typescript
     * const allPlugins = registry.getAll();
     * ```
     */
    getAll(): EditorPlugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * Retrieves a plugin by its name.
     * 
     * @param name - The name of the plugin to retrieve
     * @returns The plugin if found, undefined otherwise
     * 
     * @example
     * ```typescript
     * const plugin = registry.getByName('bold');
     * if (plugin) {
     *   // Use the plugin
     * }
     * ```
     */
    getByName(name: string): EditorPlugin | undefined {
        return this.plugins.get(name);
    }

    /**
     * Unregisters a plugin by its name.
     * 
     * @param name - The name of the plugin to unregister
     * @returns true if the plugin was found and removed, false otherwise
     * 
     * @example
     * ```typescript
     * const removed = registry.unregister('bold');
     * ```
     */
    unregister(name: string): boolean {
        const plugin = this.plugins.get(name);

        if (!plugin) {
            return false;
        }

        // Call the plugin's destroy function if provided
        if (plugin.destroy) {
            const result = plugin.destroy();
            // Handle async cleanup
            if (result instanceof Promise) {
                result.catch((error) => {
                    console.error(`Failed to destroy plugin '${name}':`, error);
                });
            }
        }

        return this.plugins.delete(name);
    }

    /**
     * Checks if a plugin with the given name is registered.
     * 
     * @param name - The name of the plugin to check
     * @returns true if the plugin is registered, false otherwise
     * 
     * @example
     * ```typescript
     * if (registry.has('bold')) {
     *   // Plugin exists
     * }
     * ```
     */
    has(name: string): boolean {
        return this.plugins.has(name);
    }

    /**
     * Clears all registered plugins.
     * 
     * @example
     * ```typescript
     * registry.clear();
     * ```
     */
    clear(): void {
        // Call destroy on all plugins before clearing
        for (const plugin of this.plugins.values()) {
            if (plugin.destroy) {
                const result = plugin.destroy();
                if (result instanceof Promise) {
                    result.catch((error) => {
                        console.error(`Failed to destroy plugin '${plugin.name}':`, error);
                    });
                }
            }
        }
        this.plugins.clear();
    }

    /**
     * Returns the number of registered plugins.
     * 
     * @returns The count of registered plugins
     * 
     * @example
     * ```typescript
     * const count = registry.size;
     * ```
     */
    get size(): number {
        return this.plugins.size;
    }
}
