'use strict';
import Maze from './maze1.js';

const patternsForMazes = {
    5: [[0,0,0,0,0],['W',0,'W','W',0],[0,0,0,0,0],[0,'W','W','W','W'],[0,0,0,0,0]],
    10:[[0,0,0,0,0,0,0,0,0,0],['W','W',0,'W','W','W','W','W','W',0],[0,0,0,0,'W',0,0,0,0,0],[0,0,0,0,'W',0,'W','W','W','W'],[0,0,0,0,'W',0,'W',0,0,0],
        [0,0,0,0,'W',0,'W',0,0,0],[0,0,0,0,'W',0,'W',0,0,0],[0,0,0,0,'W',0,'W',0,'W','W'],['W','W','W','W','W',0,'W',0,'W',0],[0,0,0,0,0,0,0,0,0,0]],
    20:[[0,0,0,'W',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,'W',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,'W',0,'W',0,0,0,0,'W','W',0,0,'W',0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,'W',0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,'W',0,0,'W',0,0,0,0,0,0,0],[0,0,0,0,0,'W',0,0,0,0,0,0,0,'W',0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,'W','W',0,0,0,'W',0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,'W',0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,'W',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        ['W','W','W',0,'W','W','W','W','W','W','W','W','W','W','W','W','W','W','W','W'],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,'W',0,0,0,0,0,0,0,0,0,0],[0,0,0,'W','W','W',0,0,0,0,'W',0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]]
};

export default class Pathfinder {
    constructor(options) {
        this._el = options.element;

        this._sizeSelector = this._el.querySelector('[data-selector="sizeSelector"]');
        this._sizeSelector.addEventListener('change', this._createMaze.bind(this));

        this._neighbourhoodSelector = this._el.querySelector('[data-selector="neighbourhoodSelector"]');

        this._nextBtn = this._el.querySelector('[data-selector="nextBtn"]');
        this._nextBtn.addEventListener('click', this._next.bind(this));

        this._goBtn = this._el.querySelector('[data-selector="goBtn"]');
        this._goBtn.addEventListener('click', this._go.bind(this));

        this._mazePlace = this._el.querySelector('[data-component="mazePlace"]');
        this._mazePlace.addEventListener('backTraceStart', this._backTraceStart.bind(this));
        this._mazePlace.addEventListener('finish', this._finish.bind(this));

        this._breadcrumbs = this._el.querySelector('[data-selector="breadcrumbs"]');

        this._stage = Pathfinder.STAGES.CHOOSING_SIZE;
    }

//------------ static constant describing stages of the process-------------
    static get STAGES() {
        return {
            CHOOSING_SIZE: 0,
            CHANGING_MAZE: 1,
            CHOOSING_START_POINT: 2,
            CHOOSING_END_POINT: 3,
            WAVE_EXPANSION:4,
            BACKTRACE: 5,
            FINISH: 6
        };
    }

//------------- static private methods------------------
    static _showEl(el) {
        el.classList.remove('js-hidden');
    }
    static _hideEl(el) {
        el.classList.add('js-hidden');
    }

//----------- get method--------------
    get stage() {
        return this._stage;
    }

//------------- event handlers----------------
    _createMaze() {
        let size = parseInt(this._sizeSelector.options[this._sizeSelector.selectedIndex].value);
        let withDiagonals = this._neighbourhoodSelector.querySelector('input[type="checkbox"]').checked;

        this._clear();

        if (size) {
            Pathfinder._hideEl(this._neighbourhoodSelector);
            Pathfinder._showEl(this._nextBtn);
            Pathfinder._showEl(this._mazePlace);

            this._maze = new Maze({
                element: this._mazePlace,
                size: size,
                withDiagonalNeighbors: withDiagonals
            });
            this._maze.fillWithPattern(patternsForMazes[size]);

            this._stage = Pathfinder.STAGES.CHANGING_MAZE;


        } else {
            Pathfinder._hideEl(this._nextBtn);
            Pathfinder._hideEl(this._goBtn);
            Pathfinder._hideEl(this._mazePlace);
            Pathfinder._showEl(this._neighbourhoodSelector);

            this._stage = Pathfinder.STAGES.CHOOSING_SIZE;
        }

        this._changeActiveStage();
    }

    _next() {
        switch (this.stage) {
            case Pathfinder.STAGES.CHANGING_MAZE: {
                this._stage = Pathfinder.STAGES.CHOOSING_START_POINT;

                this._maze.choosePoint('start');
                break;
            }

            case Pathfinder.STAGES.CHOOSING_START_POINT: {
                if (this._maze.startPoint) {
                    this._stage = Pathfinder.STAGES.CHOOSING_END_POINT;

                    this._maze.choosePoint('end');
                } else {
                    this._blinkCurrentStage();
                }
                break;
            }

            case Pathfinder.STAGES.CHOOSING_END_POINT: {
                if (this._maze.endPoint) {
                    this._stage = Pathfinder.STAGES.WAVE_EXPANSION;

                    Pathfinder._showEl(this._goBtn);

                    this._maze.nextStep();
                } else {
                    this._blinkCurrentStage();
                }
                break;
            }

            case Pathfinder.STAGES.WAVE_EXPANSION:
            case Pathfinder.STAGES.BACKTRACE: {
                this._maze.nextStep();
                break;
            }
        }

        this._changeActiveStage();
    }

    _go() {
        Pathfinder._hideEl(this._nextBtn);
        Pathfinder._hideEl(this._goBtn);

        this._timer = setInterval(this._next.bind(this), 500);
    }

    _backTraceStart() {
        this._stage = Pathfinder.STAGES.BACKTRACE;
        this._changeActiveStage();
    }

    _finish(event) {
        this._stage = Pathfinder.STAGES.FINISH;

        if (this._timer) {
            clearInterval(this._timer);
        }

        Pathfinder._hideEl(this._nextBtn);
        Pathfinder._hideEl(this._goBtn);

        this._changeActiveStage(event.detail.message);
    }
//------------------ subordinate private method---------------
    _clear() {
        if (this._timer) {
            clearInterval(this._timer);
        }

        if(this._maze) {
            this._maze.clear();
            this._maze = null;
        }
    }

//------------different non-logical private methods changing styles---------------------------
    _blinkCurrentStage() {
        let activeListItem = this._breadcrumbs.querySelector('.active');

        activeListItem.classList.add('blinked');

        setTimeout(function () {
            activeListItem.classList.remove('blinked')
        }, 500);
    }

    _changeActiveStage(message) {
        this._breadcrumbs.querySelector('.active').classList.remove('active');

        this._breadcrumbs.children[this.stage].classList.add('active');

        if (this.stage === Pathfinder.STAGES.FINISH && message) {
            this._breadcrumbs.lastElementChild.lastElementChild.innerHTML = message;
        }

    }




}