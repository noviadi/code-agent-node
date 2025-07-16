import { 
    CLIError, 
    ErrorCategory, 
    ErrorSeverity, 
    ErrorRecoveryStrategy, 
    ErrorHandlerConfig,
    FallbackConfig,
    MessageType 
} from '../types';

/**
 * Custom CLI Error class with enhanced error information
 */
export class CLIErrorImpl extends Error implements CLIError {
    public category: ErrorCategory;
    public severity: ErrorSeverity;
    public context?: string;
    public recoverable: boolean;
    public timestamp: Date;
    public originalError?: Error;

    constructor(
        message: string,
        category: ErrorCategory = ErrorCategory.UNKNOWN,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        recoverable: boolean = true,
        context?: string,
        originalError?: Error
    ) {
        super(message);
        this.name = 'CLIError';
        this.category = category;
        this.severity = severity;
        this.recoverable = recoverable;
        this.context = context;
        this.timestamp = new Date();
        this.originalError = originalError;
    }

    /**
     * Create a CLI error from a standard error
     */
    static fromError(
        error: Error, 
        category: ErrorCategory = ErrorCategory.UNKNOWN,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        context?: string
    ): CLIErrorImpl {
        return new CLIErrorImpl(
            error.message,
            category,
            severity,
            true,
            context,
            error
        );
    }

    /**
     * Get formatted error message for display
     */
    getDisplayMessage(): string {
        const contextStr = this.context ? ` (${this.context})` : '';
        return `${this.message}${contextStr}`;
    }

    /**
     * Get detailed error information for logging
     */
    getDetailedInfo(): string {
        return JSON.stringify({
            message: this.message,
            category: this.category,
            severity: this.severity,
            context: this.context,
            recoverable: this.recoverable,
            timestamp: this.timestamp.toISOString(),
            stack: this.stack,
            originalError: this.originalError ? {
                message: this.originalError.message,
                stack: this.originalError.stack
            } : undefined
        }, null, 2);
    }
}

/**
 * Comprehensive error handler for the CLI system
 */
export class ErrorHandler {
    private config: ErrorHandlerConfig;
    private fallbackConfig: FallbackConfig;
    private recoveryStrategies: Map<ErrorCategory, ErrorRecoveryStrategy>;
    private errorLog: CLIError[] = [];
    private displayManager?: any; // Will be injected

    constructor(config: ErrorHandlerConfig, fallbackConfig: FallbackConfig) {
        this.config = config;
        this.fallbackConfig = fallbackConfig;
        this.recoveryStrategies = new Map();
        this.setupDefaultRecoveryStrategies();
    }

    /**
     * Set the display manager for error output
     */
    setDisplayManager(displayManager: any): void {
        this.displayManager = displayManager;
    }

    /**
     * Handle an error with recovery attempts
     */
    async handleError(error: Error | CLIError, context?: string): Promise<boolean> {
        const cliError = this.ensureCLIError(error, context);
        
        // Log the error
        this.logError(cliError);
        
        // Try to recover from the error
        const recovered = await this.attemptRecovery(cliError);
        
        if (!recovered) {
            // Display error to user
            this.displayError(cliError);
            
            // Check if we should activate fallback mode
            if (cliError.severity === ErrorSeverity.CRITICAL) {
                await this.activateFallbackMode(cliError);
            }
        }
        
        return recovered;
    }

    /**
     * Handle input validation errors
     */
    async handleInputError(error: Error, context?: string): Promise<boolean> {
        const cliError = new CLIErrorImpl(
            `Invalid input: ${error.message}`,
            ErrorCategory.INPUT_VALIDATION,
            ErrorSeverity.LOW,
            true,
            context,
            error
        );
        
        return await this.handleError(cliError);
    }

    /**
     * Handle network-related errors
     */
    async handleNetworkError(error: Error, context?: string): Promise<boolean> {
        const cliError = new CLIErrorImpl(
            `Network error: ${error.message}`,
            ErrorCategory.NETWORK,
            ErrorSeverity.HIGH,
            true,
            context,
            error
        );
        
        return await this.handleError(cliError);
    }

    /**
     * Handle file system errors
     */
    async handleFileSystemError(error: Error, context?: string): Promise<boolean> {
        const cliError = new CLIErrorImpl(
            `File system error: ${error.message}`,
            ErrorCategory.FILE_SYSTEM,
            ErrorSeverity.MEDIUM,
            true,
            context,
            error
        );
        
        return await this.handleError(cliError);
    }

    /**
     * Handle tool execution errors
     */
    async handleToolError(error: Error, toolName?: string): Promise<boolean> {
        const context = toolName ? `tool: ${toolName}` : 'tool execution';
        const cliError = new CLIErrorImpl(
            `Tool execution failed: ${error.message}`,
            ErrorCategory.TOOL_EXECUTION,
            ErrorSeverity.MEDIUM,
            true,
            context,
            error
        );
        
        return await this.handleError(cliError);
    }

    /**
     * Handle configuration errors
     */
    async handleConfigurationError(error: Error, context?: string): Promise<boolean> {
        const cliError = new CLIErrorImpl(
            `Configuration error: ${error.message}`,
            ErrorCategory.CONFIGURATION,
            ErrorSeverity.HIGH,
            true,
            context,
            error
        );
        
        return await this.handleError(cliError);
    }

    /**
     * Handle initialization errors
     */
    async handleInitializationError(error: Error, component?: string): Promise<boolean> {
        const context = component ? `component: ${component}` : 'initialization';
        const cliError = new CLIErrorImpl(
            `Initialization failed: ${error.message}`,
            ErrorCategory.INITIALIZATION,
            ErrorSeverity.CRITICAL,
            false,
            context,
            error
        );
        
        return await this.handleError(cliError);
    }

    /**
     * Register a custom recovery strategy
     */
    registerRecoveryStrategy(category: ErrorCategory, strategy: ErrorRecoveryStrategy): void {
        this.recoveryStrategies.set(category, strategy);
    }

    /**
     * Get error statistics
     */
    getErrorStats(): { [key in ErrorCategory]: number } {
        const stats = {} as { [key in ErrorCategory]: number };
        
        // Initialize all categories to 0
        Object.values(ErrorCategory).forEach(category => {
            stats[category] = 0;
        });
        
        // Count errors by category
        this.errorLog.forEach(error => {
            stats[error.category]++;
        });
        
        return stats;
    }

    /**
     * Clear error log
     */
    clearErrorLog(): void {
        this.errorLog = [];
    }

    /**
     * Get recent errors
     */
    getRecentErrors(count: number = 10): CLIError[] {
        return this.errorLog.slice(-count);
    }

    /**
     * Check if fallback mode should be activated
     */
    shouldActivateFallback(error: CLIError): boolean {
        return error.severity === ErrorSeverity.CRITICAL || 
               (error.category === ErrorCategory.INITIALIZATION && !error.recoverable);
    }

    /**
     * Activate fallback mode with basic functionality
     */
    private async activateFallbackMode(error: CLIError): Promise<void> {
        if (this.displayManager) {
            this.displayManager.displayWarning(
                'Activating fallback mode due to critical error. Some features may be limited.'
            );
        } else {
            console.warn('⚠️  Activating fallback mode due to critical error. Some features may be limited.');
        }
        
        // Update fallback configuration
        this.fallbackConfig.useBasicReadline = true;
        this.fallbackConfig.disableColors = true;
        this.fallbackConfig.disableProgress = true;
        this.fallbackConfig.disableAutoComplete = true;
        this.fallbackConfig.disableHistory = true;
    }

    /**
     * Ensure error is a CLIError instance
     */
    private ensureCLIError(error: Error | CLIError, context?: string): CLIError {
        if (error instanceof CLIErrorImpl) {
            return error;
        }
        
        // Determine category based on error message and context
        const category = this.categorizeError(error, context);
        const severity = this.determineSeverity(error, category);
        
        return CLIErrorImpl.fromError(error, category, severity, context);
    }

    /**
     * Categorize error based on message and context
     */
    private categorizeError(error: Error, context?: string): ErrorCategory {
        const message = error.message.toLowerCase();
        const contextLower = context?.toLowerCase() || '';
        
        if (contextLower.includes('network') || message.includes('network') || 
            message.includes('fetch') || message.includes('connection')) {
            return ErrorCategory.NETWORK;
        }
        
        if (contextLower.includes('file') || message.includes('enoent') || 
            message.includes('permission') || message.includes('access')) {
            return ErrorCategory.FILE_SYSTEM;
        }
        
        if (contextLower.includes('tool') || contextLower.includes('execution')) {
            return ErrorCategory.TOOL_EXECUTION;
        }
        
        if (contextLower.includes('config') || message.includes('config')) {
            return ErrorCategory.CONFIGURATION;
        }
        
        if (contextLower.includes('init') || contextLower.includes('startup')) {
            return ErrorCategory.INITIALIZATION;
        }
        
        if (contextLower.includes('input') || message.includes('invalid')) {
            return ErrorCategory.INPUT_VALIDATION;
        }
        
        return ErrorCategory.UNKNOWN;
    }

    /**
     * Determine error severity
     */
    private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
        switch (category) {
            case ErrorCategory.INITIALIZATION:
                return ErrorSeverity.CRITICAL;
            case ErrorCategory.NETWORK:
            case ErrorCategory.CONFIGURATION:
                return ErrorSeverity.HIGH;
            case ErrorCategory.FILE_SYSTEM:
            case ErrorCategory.TOOL_EXECUTION:
                return ErrorSeverity.MEDIUM;
            case ErrorCategory.INPUT_VALIDATION:
                return ErrorSeverity.LOW;
            default:
                return ErrorSeverity.MEDIUM;
        }
    }

    /**
     * Attempt to recover from error
     */
    private async attemptRecovery(error: CLIError): Promise<boolean> {
        if (!error.recoverable) {
            return false;
        }
        
        const strategy = this.recoveryStrategies.get(error.category);
        if (!strategy || !strategy.canRecover(error)) {
            return false;
        }
        
        let attempts = 0;
        while (attempts < this.config.maxRetries) {
            try {
                const recovered = await strategy.recover(error);
                if (recovered) {
                    return true;
                }
            } catch (recoveryError) {
                // Recovery attempt failed, continue to next attempt
            }
            
            attempts++;
            if (attempts < this.config.maxRetries) {
                await this.delay(this.config.retryDelay);
            }
        }
        
        // Try fallback action if available
        if (strategy.getFallbackAction) {
            try {
                const fallbackAction = strategy.getFallbackAction(error);
                await fallbackAction();
                return true;
            } catch (fallbackError) {
                // Fallback also failed
            }
        }
        
        return false;
    }

    /**
     * Log error for debugging and monitoring
     */
    private logError(error: CLIError): void {
        this.errorLog.push(error);
        
        if (this.config.logErrors) {
            const logMessage = this.config.showStackTrace ? 
                error.getDetailedInfo() : 
                error.getDisplayMessage();
            
            console.error(`[${error.timestamp.toISOString()}] ${error.category.toUpperCase()}: ${logMessage}`);
        }
    }

    /**
     * Display error to user
     */
    private displayError(error: CLIError): void {
        if (this.displayManager) {
            this.displayManager.displayError(error, error.context);
        } else {
            // Fallback to console output
            const prefix = this.getSeverityPrefix(error.severity);
            console.error(`${prefix} ${error.getDisplayMessage()}`);
        }
    }

    /**
     * Get severity prefix for console output
     */
    private getSeverityPrefix(severity: ErrorSeverity): string {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
                return '🚨';
            case ErrorSeverity.HIGH:
                return '❌';
            case ErrorSeverity.MEDIUM:
                return '⚠️';
            case ErrorSeverity.LOW:
                return 'ℹ️';
            default:
                return '❓';
        }
    }

    /**
     * Setup default recovery strategies
     */
    private setupDefaultRecoveryStrategies(): void {
        // Network error recovery
        this.recoveryStrategies.set(ErrorCategory.NETWORK, {
            canRecover: (error) => error.recoverable,
            recover: async (error) => {
                // Simple retry logic for network errors
                return false; // Let the retry mechanism handle it
            },
            getFallbackAction: (error) => async () => {
                if (this.displayManager) {
                    this.displayManager.displayWarning(
                        'Network connectivity issues detected. Some features may be limited.'
                    );
                }
            }
        });

        // File system error recovery
        this.recoveryStrategies.set(ErrorCategory.FILE_SYSTEM, {
            canRecover: (error) => error.recoverable && !error.message.includes('permission'),
            recover: async (error) => {
                // Try to create directories or handle common file system issues
                return false; // Specific recovery would be implemented per use case
            }
        });

        // Configuration error recovery
        this.recoveryStrategies.set(ErrorCategory.CONFIGURATION, {
            canRecover: (error) => error.recoverable,
            recover: async (error) => {
                // Try to reset to default configuration
                return false; // Would need access to configuration manager
            },
            getFallbackAction: (error) => async () => {
                if (this.displayManager) {
                    this.displayManager.displayWarning(
                        'Using default configuration due to configuration error.'
                    );
                }
            }
        });
    }

    /**
     * Utility method for delays
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get fallback configuration
     */
    getFallbackConfig(): FallbackConfig {
        return { ...this.fallbackConfig };
    }

    /**
     * Update fallback configuration
     */
    updateFallbackConfig(updates: Partial<FallbackConfig>): void {
        this.fallbackConfig = { ...this.fallbackConfig, ...updates };
    }
}