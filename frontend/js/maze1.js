'use strict';

import * as polyfills from'./polyfills';

polyfills.installMatches(); //cross browser polyfill for 'matches' (does not supported by IE)
polyfills.installClosest(); //cross browser polyfill for 'closest' (does not supported by IE)
polyfills.installCustomEvent(); //cross browser polyfill for 'custom events' (does not supported by IE)

export default class Maze {
    constructor(options) {
        this._el = options.element;
        this._size = options.size;
        this._neighborhoodCondition = options.withDiagonalNeighbors ? Maze.NEIGHBORHOOD.ORTHO_DIAGONAL : Maze.NEIGHBORHOOD.ORTHOGONAL;

        this._renderMaze();

        this._map = this._el.querySelector('[data-selector="map"]');
        this._map.addEventListener('click', Maze._changeCell);

        this._startPoint = undefined;
        this._endPoint = undefined;
        this._step = undefined;
    }
    static get NEIGHBORHOOD() {
        return {
            ORTHOGONAL: function(cellX, cellY, neighbourX, neighbourY) {// according to 'von Neumann neighborhood' conception
                return ( (neighbourY === cellY && neighbourX !== cellX)
                || (neighbourY !== cellY && neighbourX === cellX) );
            },

            ORTHO_DIAGONAL: function(cellX, cellY, neighbourX, neighbourY) { //according to 'Moore neighborhood' conception
             return (neighbourY !== cellY || neighbourX !== cellX)
            }
        }
    }
//----------- get methods--------------
    get size() {
        return this._size;
    }

    get startPoint() {
        return this._startPoint;
    }

    get endPoint() {
        return this._endPoint;
    }

    get step() {
        return this._step;
    }

//------------- public methods---------------
    clear() {
        this._el.innerHTML = '';
        this._map = null;
    }

    fillWithPattern(pattern) {
        if (this.startPoint) {
            return;
        }

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                let td = this._map.rows[i].cells[j];

                if (pattern[i][j] === 'W') {
                    td.dataset.info = 'W';
                    Maze._toggleWall(td);
                }
            }
        }
    }

    choosePoint(point) {
        if (this.step) {
            return;
        }

        if (point === 'start') {
            this._map.removeEventListener('click', Maze._changeCell);

            this._choosing = {
                info: 'S',
                toggle: Maze._toggleStart
            };

            this._markPoint = this._markPoint.bind(this);
            this._map.addEventListener('click', this._markPoint);
        }

        if (point === 'end') {
            this._choosing = {
                info: 'E',
                toggle: Maze._toggleFinish
            };
        }
    }

    nextStep() {
        let message;

        if (!this.startPoint || !this.endPoint) {
            return;
        }

        if (!this._step) {
            this._map.removeEventListener('click', this._markPoint);

            this.startPoint.innerHTML = '0';
            this.endPoint.dataset.info = '';

            this._step = 1;
        }

        if (!this.endPoint.innerHTML) {
            let wasMarked = this._waveExpansionStep();

            if (!wasMarked) {
                message = 'There is no path could be found!';
            }
        } else {
            this._backTraceStart();

            if (!this._backTraceStep()) {
                message = 'The path was found!';
            }
        }

        if (message) {
            this._finish(message);
        }
    }

    cellNeighbours(y,x) {
        let neighbours = [];

        for (let i = Math.max(y - 1, 0); i <= Math.min(y + 1, this.size - 1); i++) {
            for (let j = Math.max(x - 1, 0); j <= Math.min(x + 1, this.size - 1); j++) {
                if ( this._neighborhoodCondition(x,y,j,i) ) {
                    neighbours.push(this._map.rows[i].cells[j]);
                }
            }
        }

        return neighbours;
    }

//------------- event handlers----------------
    static _changeCell(event) {
        let td = event.target.closest('td');

        if (!td) {
            return;
        }

        if (td.dataset.info) {
            td.dataset.info = '';
        } else {
            td.dataset.info = 'W'
        }

        Maze._toggleWall(td);
    }

    _markPoint(event) {
        let td = event.target.closest('td');

        if (!td) {
            return;
        }

        if (this._choosing.point) {
            if (td === this._choosing.point) {
                this._choosing.point = null;

                td.dataset.info = '';
                this._choosing.toggle(td);
            }
        } else if (!td.dataset.info) {
            this._choosing.point = td;

            td.dataset.info = this._choosing.info;
            this._choosing.toggle(td);
        }

        switch (this._choosing.info) {
            case 'S': {
                this._startPoint = this._choosing.point;
                break;
            }
            case 'E': {
                this._endPoint = this._choosing.point;
                break;
            }
        }
    }

//------------- private methods---------------
    _renderMaze() {
        let mazeHtml = '<table data-selector="map">';

        for (let i = 0; i < this.size; i++) {
            mazeHtml +='<tr>\n';
            for (let j = 0; j < this.size; j++) {
                mazeHtml+='<td></td>\n';
            }
            mazeHtml +='</tr>';
        }

        mazeHtml +=  '</table>';
        this._el.insertAdjacentHTML('beforeEnd',mazeHtml);
    }

    _waveExpansionStep() {
        let step = this._step;
        let wasMarked = false;

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                let td = this._map.rows[i].cells[j];

                if (parseInt(td.innerHTML) === (step - 1)) {

                    this.cellNeighbours(i,j)
                        .filter(cell => !cell.innerHTML && !cell.dataset.info)
                        .forEach(cell => {
                            cell.innerHTML = step;
                            wasMarked = true;
                        });
                }
            }
        }
        this._step++;

        return wasMarked;
    }

    _backTraceStart() {
        let event = new CustomEvent("backTraceStart");

        this._el.dispatchEvent(event);
    }

    _backTraceStep() {
        if (!this._currentCell) {
            this._currentCell = this.endPoint;
        }

        let neighbours = this.cellNeighbours(this._currentCell.parentNode.rowIndex, this._currentCell.cellIndex);

        this._currentCell = this._nextCellWithMinSteps(this._currentCell, neighbours);

        if (this._currentCell === this.startPoint) {
            return false;
        } else {
            Maze._markPath(this._currentCell);

            return true;
        }
    }

    _finish(message) {
        let event = new CustomEvent("finish", {
            detail: {message: message}
        });

        this._el.dispatchEvent(event);
    }

    _nextCellWithMinSteps(currentCell, neighborCells) {
        return neighborCells.reduce( (cellWithMinSteps, cell)=> {
            if ( parseInt(cell.innerHTML) < parseInt(cellWithMinSteps.innerHTML) ) {
                cellWithMinSteps = cell;
            }
            return cellWithMinSteps;

        },currentCell);
    }

//---------different non-logical private methods changing styles-------------
    static _toggleWall(cell) {
        cell.classList.toggle('wall');
    }

    static _toggleStart(cell) {
        cell.classList.toggle('start');
    }

    static _toggleFinish(cell) {
        cell.classList.toggle('finish');
    }

    static _markPath(cell) {
        cell.classList.add('path');
    }
}
