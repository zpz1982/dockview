import { Emitter, Event } from '../events';
import { PaneviewPanel } from '../paneview/paneviewPanel';
import { IPanelApi, PanelApi } from './panelApi';

export interface ExpansionEvent {
    isExpanded: boolean;
}

export interface IPanePanelApi extends IPanelApi {
    onDidExpansionChange: Event<ExpansionEvent>;
    readonly onMouseEnter: Event<MouseEvent>;
    readonly onMouseLeave: Event<MouseEvent>;
    setExpanded(isExpanded: boolean): void;
    readonly isExpanded: boolean;
}

export class PanePanelApi extends PanelApi implements IPanePanelApi {
    readonly _onDidExpansionChange = new Emitter<ExpansionEvent>({
        replay: true,
    });
    readonly onDidExpansionChange: Event<ExpansionEvent> = this
        ._onDidExpansionChange.event;

    readonly _onMouseEnter = new Emitter<MouseEvent>({});
    readonly onMouseEnter: Event<MouseEvent> = this._onMouseEnter.event;
    readonly _onMouseLeave = new Emitter<MouseEvent>({});
    readonly onMouseLeave: Event<MouseEvent> = this._onMouseLeave.event;

    constructor(public pane: PaneviewPanel) {
        super();
    }

    setExpanded(isExpanded: boolean): void {
        this.pane.setExpanded(isExpanded);
    }

    get isExpanded() {
        return this.pane.isExpanded();
    }
}
