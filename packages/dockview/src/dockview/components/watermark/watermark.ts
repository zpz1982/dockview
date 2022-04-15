import {
    GroupPanelPartInitParameters,
    IWatermarkRenderer,
} from '../../../groupview/types';
import { ActionContainer } from '../../../actionbar/actionsContainer';
import { addDisposableListener } from '../../../events';
import { toggleClass } from '../../../dom';
import { CompositeDisposable } from '../../../lifecycle';
import { GroupviewPanel } from '../../../groupview/groupviewPanel';
import { PanelUpdateEvent } from '../../../panel/types';

export class Watermark
    extends CompositeDisposable
    implements IWatermarkRenderer
{
    private _element: HTMLElement;
    private group: GroupviewPanel | undefined;
    private _params: GroupPanelPartInitParameters | undefined;

    get id() {
        return 'watermark';
    }

    get params(): Record<string, any> | undefined {
        return this._params?.params;
    }

    constructor() {
        super();
        this._element = document.createElement('div');
        this._element.className = 'watermark';

        const title = document.createElement('div');
        title.className = 'watermark-title';

        const emptySpace = document.createElement('span');
        emptySpace.style.flexGrow = '1';

        const content = document.createElement('div');
        content.className = 'watermark-content';

        this._element.appendChild(title);
        this._element.appendChild(content);

        const actions = new ActionContainer();
        title.appendChild(emptySpace);
        title.appendChild(actions.element);

        const closeAnchor = document.createElement('a');
        closeAnchor.className = 'close-action';

        actions.add(closeAnchor);

        this.addDisposables(
            addDisposableListener(closeAnchor, 'click', (ev) => {
                ev.preventDefault();
                if (this.group) {
                    this._params?.containerApi.removeGroup(this.group);
                }
            })
        );
    }

    update(event: PanelUpdateEvent) {
        // noop
    }

    focus() {
        // noop
    }

    toJSON() {
        return {};
    }

    layout(width: number, height: number) {
        // noop
    }

    init(params: GroupPanelPartInitParameters) {
        this._params = params;

        this.addDisposables(
            this._params.containerApi.onDidLayoutChange((event) => {
                this.render();
            })
        );

        this.render();
    }

    updateParentGroup(group: GroupviewPanel, visible: boolean): void {
        this.group = group;
        this.render();
    }

    get element() {
        return this._element;
    }

    private render() {
        const isOneGroup = !!(
            this._params && this._params.containerApi.size <= 1
        );
        toggleClass(this.element, 'has-actions', isOneGroup);
    }

    dispose() {
        super.dispose();
    }
}
