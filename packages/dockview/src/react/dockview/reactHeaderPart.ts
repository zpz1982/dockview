import * as React from 'react';
import {
    ITabRenderer,
    GroupPanelPartInitParameters,
} from '../../groupview/types';
import { GroupviewPanel } from '../../groupview/groupviewPanel';
import { PanelUpdateEvent } from '../../panel/types';
import { ReactPart, ReactPortalStore } from '../react';
import { IGroupPanelBaseProps } from './dockview';

export class ReactPanelHeaderPart implements ITabRenderer {
    private _element: HTMLElement;
    private part?: ReactPart<IGroupPanelBaseProps>;

    private _parameters: GroupPanelPartInitParameters | undefined;

    get element() {
        return this._element;
    }

    get params(): Record<string, any> | undefined {
        return {};
    }

    constructor(
        public readonly id: string,
        private readonly component: React.FunctionComponent<IGroupPanelBaseProps>,
        private readonly reactPortalStore: ReactPortalStore
    ) {
        this._element = document.createElement('div');
        this._element.className = 'dockview-react-part';
    }

    focus() {
        //noop
    }

    public init(parameters: GroupPanelPartInitParameters): void {
        this._parameters = parameters;

        this.part = new ReactPart(
            this.element,
            this.reactPortalStore,
            this.component,
            {
                params: parameters.params,
                api: parameters.api,
                containerApi: parameters.containerApi,
            }
        );
    }

    public update(event: PanelUpdateEvent) {
        this.part?.update(event.params);
    }

    public toJSON() {
        return {
            id: this.id,
        };
    }

    public layout(width: number, height: number) {
        // noop - retrieval from api
    }

    public updateParentGroup(
        group: GroupviewPanel,
        isPanelVisible: boolean
    ): void {
        // noop - retrieval from api
    }

    public dispose() {
        this.part?.dispose();
    }
}
