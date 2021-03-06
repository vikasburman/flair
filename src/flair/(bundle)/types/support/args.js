/**
 * @name Args
 * @description Lightweight args pattern processing that returns a validator function to validate arguments against given arg patterns
 * @example
 *  Args(...patterns)
 * @params
 *  patterns: string(s) - multiple pattern strings, each representing one pattern set
 *                        each pattern set can take following forms:
 *                        'type, type, type, ...' OR 'name: type, name: type, name: type, ...'
 *                          type: can be following:
 *                              > special types: 'undefined' - for absence of a passed value
 *                              > expected native javascript data types like 'string', 'number', 'function', 'array', etc.
 *                              > 'function' - any function, cfunction' - constructor function and 'afunction - arrow function
 *                              > inbuilt flair object types like 'class', 'struct', 'enum', etc.
 *                              > custom flair object instance types which are checked in following order:
 *                                  >> for class instances: 
 *                                     isInstanceOf given as type
 *                                     isImplements given as interface 
 *                                     isMixed given as mixin
 *                                  >> for struct instances:
 *                                     isInstance of given as struct type
 *                          name: argument name which will be used to store extracted value by parser
 * @returns {function} - validator function that is configured for specified patterns
 */ 
const _Args = (...patterns) => {
    if (patterns.length === 0) { throw _Exception.InvalidArgument('patterns', _Args); }

    /**
     * @description Args validator function that validates against given patterns
     * @example
     *  (...args)
     * @params
     *  args: any - multiple arguments to match against given pattern sets
     * @returns {object} - result object, having:
     *  raw: (array) - original arguments as passed
     *  index: (number) - index of pattern-set that matches for given arguments, -1 if no match found
     *                    if more than one patterns may match, it will stop at first match
     *  types: (string) - types which matched - e.g., string_string
     *                    this is the '_' joint string of all type definition part from the matching pattern-set
     *  isInvalid: (boolean) - to check if any match could not be achieved
     *  <name(s)>: <value(s)> - argument name as given in pattern having corresponding argument value
     *                          if a name was not given in pattern, a default unique name will be created
     *                          special names like 'raw', 'index' and 'isInvalid' cannot be used.
     */    
    let _args = (...args) => {
        // process each pattern - exit with first matching pattern
        let types = null, items = null,
            name = '', type = '',
            pIndex = -1, aIndex = -1,   // pattern index, argument index
            matched = false,
            mCount = 0, // matched arguments count of pattern
            faliedMatch = '',
            result = {
                raw: args || [],
                index: -1,
                isInvalid: false,
                error: null,
                values: {}
            };
        if (patterns) {
            for(let pattern of patterns) { // pattern
                pIndex++; aIndex=-1; matched = false; mCount = 0;
                types = pattern.split(',');
                for(let item of types) {
                    aIndex++;
                    items = item.split(':');
                    if (items.length !== 2) { 
                        name = `_${pIndex}_${aIndex}`; // e.g., _0_0 or _1_2, etc.
                        type = item.trim() || '';
                    } else {
                        name = items[0].trim() || '',
                        type = items[1].trim() || '';
                    }
                    if (aIndex > result.raw.length) { matched = false; break; }
                    if (!_is(result.raw[aIndex], type)) { matched = false; faliedMatch = name; break; }
                    result.values[name] = result.raw[aIndex]; matched = true; mCount++;
                }
                if (matched && mCount === types.length) {result.index = pIndex; break; }
            }
        }

        // set state
        result.isInvalid = (result.index === -1 ? true : false);
        result.error = (result.isInvalid ? _Exception.InvalidArgument(faliedMatch) : null);

        // throw helper
        result.throwOnError = (stStart) => {
            if (result.error) { throw new _Exception(result.error, stStart || _args); }
        };

        // return
        return Object.freeze(result);
    };

    // return freezed
    return Object.freeze(_args);
};

// attach to flair
a2f('Args', _Args);
