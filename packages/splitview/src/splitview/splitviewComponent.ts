import { CompositeDisposable, IDisposable } from '../lifecycle';
import {
    LayoutPriority,
    Orientation,
    Sizing,
    Splitview,
} from './core/splitview';
import { SplitPanelOptions } from './core/options';
import { BaseComponentOptions } from '../panel/types';
import { Emitter, Event } from '../events';
import { SplitviewApi } from '../api/component.api';
import { SplitviewPanel } from './splitviewPanel';
import { createComponent } from '../panel/componentFactory';

export interface SerializedSplitviewPanel {
    snap?: boolean;
    priority?: LayoutPriority;
    minimumSize?: number;
    maximumSize?: number;
    data: {
        id: string;
        component: string;
        props?: { [index: string]: any };
        state?: { [index: string]: any };
    };
    size: number;
}

export interface SerializedSplitview {
    orientation: Orientation;
    size: number;
    activeView: string;
    views: SerializedSplitviewPanel[];
}

export interface AddSplitviewComponentOptions extends BaseComponentOptions {
    size?: number;
    index?: number;
    minimumSize?: number;
    maximumSize?: number;
}

export interface ISplitviewPanels extends IDisposable {
    readonly minimumSize: number;
    readonly maximumSize: number;
    readonly height: number;
    readonly width: number;
    readonly length: number;
    addPanel(options: AddSplitviewComponentOptions): void;
    layout(width: number, height: number): void;
    onDidLayoutChange: Event<void>;
    toJSON(): SerializedSplitview;
    fromJSON(data: SerializedSplitview): void;
    resizeToFit(): void;
    focus(): void;
    getPanel(id: string): SplitviewPanel | undefined;
    setActive(view: SplitviewPanel, skipFocus?: boolean): void;
    removePanel(panel: SplitviewPanel, sizing?: Sizing): void;
    getPanels(): SplitviewPanel[];
    setVisible(panel: SplitviewPanel, visible: boolean): void;
    movePanel(from: number, to: number): void;
}

/**
 * A high-level implementation of splitview that works using 'panels'
 */
export class SplitviewComponent
    extends CompositeDisposable
    implements ISplitviewPanels {
    private splitview: Splitview;
    private _activePanel: SplitviewPanel;
    private panels = new Map<string, IDisposable>();

    private readonly _onDidLayoutChange = new Emitter<void>();
    readonly onDidLayoutChange: Event<void> = this._onDidLayoutChange.event;

    get minimumSize() {
        return this.splitview.minimumSize;
    }

    get maximumSize() {
        return this.splitview.maximumSize;
    }

    get height() {
        return this.splitview.orientation === Orientation.HORIZONTAL
            ? this.splitview.orthogonalSize
            : this.splitview.size;
    }

    get width() {
        return this.splitview.orientation === Orientation.HORIZONTAL
            ? this.splitview.size
            : this.splitview.orthogonalSize;
    }

    get length() {
        return this.panels.size;
    }

    constructor(
        private readonly element: HTMLElement,
        private readonly options: SplitPanelOptions
    ) {
        super();

        if (!options.components) {
            options.components = {};
        }
        if (!options.frameworkComponents) {
            options.frameworkComponents = {};
        }

        this.splitview = new Splitview(this.element, options);

        this.addDisposables(
            this.splitview.onDidSashEnd(() => {
                this._onDidLayoutChange.fire(undefined);
            }),
            this.splitview
        );
    }

    focus() {
        this._activePanel?.focus();
    }

    movePanel(from: number, to: number) {
        this.splitview.moveView(from, to);
    }

    setVisible(panel: SplitviewPanel, visible: boolean) {
        const index = this.getPanels().indexOf(panel);
        this.splitview.setViewVisible(index, visible);
    }

    setActive(view: SplitviewPanel, skipFocus?: boolean) {
        this._activePanel = view;

        this.getPanels()
            .filter((v) => v !== view)
            .forEach((v) => v.setActive(false, skipFocus));
        view.setActive(true, skipFocus);
    }

    getPanels(): SplitviewPanel[] {
        return this.splitview.getViews() as SplitviewPanel[];
    }

    removePanel(panel: SplitviewPanel, sizing?: Sizing) {
        const disposable = this.panels.get(panel.id);
        disposable?.dispose();
        this.panels.delete(panel.id);

        const index = this.getPanels().findIndex((_) => _ === panel);
        this.splitview.removeView(index, sizing);
    }

    getPanel(id: string): SplitviewPanel | undefined {
        return this.getPanels().find((view) => view.id === id);
    }

    addPanel(options: AddSplitviewComponentOptions): void {
        if (this.panels.has(options.id)) {
            throw new Error(`panel ${options.id} already exists`);
        }

        const view = createComponent(
            options.id,
            options.component,
            this.options.components,
            this.options.frameworkComponents,
            { createComponent: this.options.frameworkWrapper?.createComponent }
        );

        view.orientation = this.splitview.orientation;

        view.init({
            params: options.params,
            minimumSize: options.minimumSize,
            maximumSize: options.maximumSize,
            snap: options.snap,
            priority: options.priority,
            containerApi: new SplitviewApi(this),
        });

        const size: Sizing | number =
            typeof options.size === 'number' ? options.size : Sizing.Distribute;
        const index =
            typeof options.index === 'number' ? options.index : undefined;

        this.splitview.addView(view, size, index);

        this.doAddView(view);
        this.setActive(view);
    }

    /**
     * Resize the layout to fit the parent container
     */
    resizeToFit(): void {
        if (!this.element.parentElement) {
            return;
        }
        const {
            width,
            height,
        } = this.element.parentElement?.getBoundingClientRect();
        this.layout(width, height);
    }

    layout(width: number, height: number): void {
        const [size, orthogonalSize] =
            this.splitview.orientation === Orientation.HORIZONTAL
                ? [width, height]
                : [height, width];
        this.splitview.layout(size, orthogonalSize);
    }

    private doAddView(view: SplitviewPanel) {
        const disposable = view.api.onDidFocusChange((event) => {
            if (!event.isFocused) {
                return;
            }
            this.setActive(view, true);
        });

        this.panels.set(view.id, disposable);
    }

    toJSON(): SerializedSplitview {
        const views: SerializedSplitviewPanel[] = this.splitview
            .getViews<SplitviewPanel>()
            .map((view, i) => {
                const size = this.splitview.getViewSize(i);
                return {
                    size,
                    data: view.toJSON(),
                    minimumSize: view.minimumSize,
                    maximumSize: view.maximumSize,
                    snap: !!view.snap,
                    priority: view.priority,
                };
            });

        return {
            views,
            activeView: this._activePanel?.id,
            size: this.splitview.size,
            orientation: this.splitview.orientation,
        };
    }

    fromJSON(data: SerializedSplitview): void {
        const { views, orientation, size, activeView } = data;

        this.splitview.dispose();

        const queue: Function[] = [];

        this.splitview = new Splitview(this.element, {
            orientation,
            proportionalLayout: this.options.proportionalLayout,
            descriptor: {
                size,
                views: views.map((view) => {
                    const data = view.data;

                    if (this.panels.has(data.id)) {
                        throw new Error(`panel ${data.id} already exists`);
                    }

                    const panel = createComponent(
                        data.id,
                        data.component,
                        this.options.components,
                        this.options.frameworkComponents,
                        {
                            createComponent: this.options.frameworkWrapper
                                ?.createComponent,
                        }
                    );

                    queue.push(() => {
                        panel.init({
                            params: data.props,
                            minimumSize: view.minimumSize,
                            maximumSize: view.maximumSize,
                            snap: view.snap,
                            priority: view.priority,
                            containerApi: new SplitviewApi(this),
                        });
                    });

                    panel.orientation = orientation;

                    this.doAddView(panel);

                    return { size: view.size, view: panel };
                }),
            },
        });

        queue.forEach((f) => f());

        if (typeof activeView === 'string') {
            this.getPanel(activeView)?.setActive(true);
        }
    }

    dispose() {
        Array.from(this.panels.values()).forEach((value) => {
            value.dispose();
        });
        this.panels.clear();

        super.dispose();
    }
}
