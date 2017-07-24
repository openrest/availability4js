import * as Status from './Status';
import {Index, findInsertionIndex, getTime, normalize} from './DateTimeWindowsUtils';
import _ from 'lodash';

export class DateTimeWindowsIterator {
	/**
	 * @param timeWindows   List<DateTimeWindow>
	 * @param cal           Moment with tz
	 */
    constructor({timeWindows = [], cal}) {
        this._tz = cal.tz();
        timeWindows = timeWindows || []; // null timeWindows is supported, equivalent to empty timeWindows

        const calValue = cal.valueOf();
        timeWindows = _.filter(timeWindows, win => {
            const endTime = getTime(win.end, this._tz);
            return endTime === null || endTime > calValue;
        });

        this._timeWindows = normalize(timeWindows);

        this._index = null;
        this._lastWindowUntilForever = null;
        if (this._timeWindows.length > 0) {
            this._index = findInsertionIndex(this._timeWindows, cal.valueOf(), this._tz);
            this._lastWindowUntilForever = !this._timeWindows[this._timeWindows.length-1].end;
        } else {
            this._index = new Index(0, true);
            this._lastWindowUntilForever = false;
        }

    }

	/** @return Boolean */
    hasNext() {
        if (this._index.index < this._timeWindows.length) {
            return true;
        }

        return (this._index.isDummyBefore && !this._lastWindowUntilForever);
    }

	/** @return Status */
    next() {
        let result;

        if (this._index.index === this._timeWindows.length) {
            result = {
                status : Status.STATUS_UNKNOWN,
                until : null
            };
        } else {
            const nextTimeWindow = this._timeWindows[this._index.index];
            if (!this._index.isDummyBefore) {
                result = {
                    status: (nextTimeWindow.available ? Status.STATUS_AVAILABLE : Status.STATUS_UNAVAILABLE),
                    until: getTime(nextTimeWindow.end, this._tz),
                    reason: nextTimeWindow.reason,
                    comment: nextTimeWindow.comment
                };
            } else {
                result = {
                    status: Status.STATUS_UNKNOWN,
                    until: getTime(nextTimeWindow.start, this._tz)
                };
            }
        }

        this._index.advance();
        return result;
    }
}
