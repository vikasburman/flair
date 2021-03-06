/**
 * @preserve
 * <<title>>
 * <<desc>>
 * 
 * Assembly: <<asm>>
 *     File: <<file>>
 *  Version: <<version>>
 *  <<lupdate>>
 * 
 * <<copyright>>
 * <<license>>
 */
(function(root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) { // AMD support
        define(() => { return factory(); });
    } else if (typeof exports === 'object') { // CommonJS and Node.js module support
        let fo = factory();
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = fo; // Node.js specific `module.exports`
        }
        module.exports = exports = fo; // CommonJS        
    } else { // expose as global on window
        root.flair = factory();
    }
})((this || globalThis), function() {
    'use strict';

    /* eslint-disable no-unused-vars */
    // locals
    let isServer = new Function("try {return this===global;}catch(e){return false;}")(),
        isWorker = false,
        sym = [],
        symKey = 'FLAIR_SYMBOLS',
        symString = '',
        meta = Symbol('[meta]'),
        modulesRootFolder = 'modules',
        disposers = [],
        options = {},
        flairTypes = ['class', 'enum', 'interface', 'mixin', 'struct'],
        flairInstances = ['instance', 'sinstance'],
        settings = {},
        config = {},
        envX = null,
        envProps = {},
        isAppStarted = false;
    /* eslint-enable no-unused-vars */

    // worker setting
    if (isServer) {
        try {
            let worker_threads = require('worker_threads');
            isWorker = worker_threads.isMainThread;
        } catch (err) { // eslint-disable-line no-unused-vars
            isWorker = false;
        }
    } else { // client
        isWorker = (typeof WorkerGlobalScope !== 'undefined' ? true : false);
    }

    // flairapp bootstrapper
    let flair = async (arg1, arg2) => {
        let ADO = null,
            options = null;
        if (typeof arg1 === 'string') { // just the  entry point is specified
            options = { main: arg1 };
        } else if (arg1.main && arg1.module && arg1.engine) { // this is start options object
            options = arg1;
        } else {
            ADO = arg1;
        }
        
        if (options) {
            if (typeof arg2 === 'string') { options.config = arg2; } // config is also given
            if (!isAppStarted) {
                // boot
                isAppStarted = await flair.AppDomain.boot(options);
            }

            // return
            return flair.AppDomain.app();
        } else if (ADO) {
            flair.AppDomain.registerAdo(ADO);
        }
    };

    // read symbols from environment
    // symbols can be pass in variety of formats: 
    //  server: command line args (process.argv), environment variables (process.env.FLAIR_SYMBOLS)
    //  worker-server: get whatever symbols collection server main thread had - passed as workerData.symbols
    //  client: global variable (window.FLAIR_SYMBOLS)
    //  worker-client: get whatever symbols collection client main thread had - set in WorkerGlobalScope
    if (isServer) {
        if (isWorker) {
            // from workerData.symbols
            let workerData = require('worker_threads').workerData;
            symString = workerData.symbols || '';
        } else {
            // from process.argv
            let idx = process.argv.findIndex((item) => { return (item.startsWith(`--${symKey}`) ? true : false); });
            if (idx !== -1) { symString = process.argv[idx].substr(2).split('=')[1]; }

            // from process.env
            if (process.env[symKey]) { // add to list
                if (symString) { symString += ','; }
                symString += process.env[symKey];
            }
        }
    } else { // client
        if (isWorker) {
            symString = WorkerGlobalScope[symKey] || '';
        } else {
            // from window
            symString += window[symKey] || '';
        }
    }
    if (symString) { sym = symString.split(',').map(item => item.trim()); }
    //

    options.symbols = Object.freeze(sym);
    options.env = Object.freeze({
        type: (isServer ? 'server' : 'client'),
        isServer: isServer,
        isClient: !isServer,
        isWorker : isWorker,
        isMain: !isWorker,
        cores: ((isServer ? (require('os').cpus().length) : window.navigator.hardwareConcurrency) || 4),
        isCordova: (!isServer && !!window.cordova),
        isNodeWebkit: (isServer && process.versions['node-webkit']),
        isProd: ((sym.indexOf('PROD') !== -1 || sym.indexOf('STAGE') !== -1) && sym.indexOf('DEV') === -1),
        isStage: (sym.indexOf('STAGE') !== -1 && sym.indexOf('DEV') === -1),        
        isDev: (sym.indexOf('DEV') !== -1),        
        isLocal: ((isServer ? require('os').hostname() : self.location.host).indexOf('local') !== -1),
        isDebug: (sym.indexOf('DEBUG') !== -1),
        isTest: (sym.indexOf('TEST') !== -1),
        isAppMode: () => { return isAppStarted; },
        x: (once) => { 
            if (!envX && once) { envX = Object.freeze(once); } // set once - extra env properties are added here during runtime, generally via reading from a config file - once
            return envX || {};
        },
        props: (ns, key, value) => {
            if (typeof value === 'undefined') {
                if (typeof key === 'undefined') {
                    return envProps[ns] || {};
                } else {
                    return (envProps[ns] ? envProps[ns][key] : null);
                }
            } else {
                envProps[ns] = envProps[ns] || {};
                if (value === null) {
                    delete envProps[ns][key];
                } else {
                    envProps[ns][key] = value;
                }
            }
        }
    });
    // Prod / Stage vs Dev are mutually exclusive environments
    // Prod is set to true when either PROD or STAGE or both are present and DEV is not present
    // Stage is true only when STAGE is present and DEV is not present
    // Dev is true only when DEV is present even if PROD / STAGE is also present
    // Local, Debug and Test can be true in any of these environments

    // flair
    flair.members = [];
    flair.options = Object.freeze(options);
    flair.env = flair.options.env; // direct env access as well
    const a2f = (name, obj, disposer) => {
        flair[name] = Object.freeze(obj);
        flair.members.push(name);
        if (typeof disposer === 'function') { disposers.push(disposer); }
    };

    // members
    <!-- inject: ./(bundle)/types/support/noop.js -->   
    <!-- inject: ./(bundle)/types/support/nip.js -->   
    <!-- inject: ./(bundle)/types/support/nim.js -->   
    <!-- inject: ./(bundle)/types/support/Exception.js -->  
    <!-- inject: ./(bundle)/types/support/general.js -->  
    <!-- inject: ./(bundle)/types/get/typeOf.js -->   
    <!-- inject: ./(bundle)/types/check/is.js --> 
    <!-- inject: ./(bundle)/types/check/isDefined.js --> 
    <!-- inject: ./(bundle)/types/support/args.js -->   
    <!-- inject: ./(bundle)/types/support/event.js -->   
    <!-- inject: ./(bundle)/types/support/nie.js -->   
    <!-- inject: ./(bundle)/types/support/Dispatcher.js -->
    <!-- inject: ./(bundle)/types/support/InjectedArg.js -->
    <!-- inject: ./(bundle)/port/port.js -->

    <!-- inject: ./(bundle)/assembly/AssemblyLoadContext.js -->  
    <!-- inject: ./(bundle)/assembly/Assembly.js -->  
    <!-- inject: ./(bundle)/assembly/Resource.js -->  
    <!-- inject: ./(bundle)/assembly/Route.js -->  
    <!-- inject: ./(bundle)/assembly/SharedChannel.js -->  
    <!-- inject: ./(bundle)/assembly/AppDomainProxy.js -->  
    <!-- inject: ./(bundle)/assembly/AssemblyLoadContextProxy.js -->  
    <!-- inject: ./(bundle)/assembly/AppDomain.js -->  

    <!-- inject: ./(bundle)/types/get/getAttr.js -->
    <!-- inject: ./(bundle)/types/get/getAssembly.js -->   
    <!-- inject: ./(bundle)/types/get/getAssemblyOf.js -->   
    <!-- inject: ./(bundle)/types/get/getContext.js -->   
    <!-- inject: ./(bundle)/types/get/getResource.js -->  
    <!-- inject: ./(bundle)/types/get/getRoute.js -->
    <!-- inject: ./(bundle)/types/get/getType.js -->   
    <!-- inject: ./(bundle)/types/get/getTypeOf.js -->    
    <!-- inject: ./(bundle)/types/get/getTypeName.js -->    
    <!-- inject: ./(bundle)/types/get/ns.js -->    
    <!-- inject: ./(bundle)/types/check/isDerivedFrom.js --> 
    <!-- inject: ./(bundle)/types/check/isAbstract.js --> 
    <!-- inject: ./(bundle)/types/check/isSealed.js --> 
    <!-- inject: ./(bundle)/types/check/isStatic.js --> 
    <!-- inject: ./(bundle)/types/check/isSingleton.js --> 
    <!-- inject: ./(bundle)/types/check/isDeprecated.js --> 
    <!-- inject: ./(bundle)/types/check/isInstanceOf.js -->  
    <!-- inject: ./(bundle)/types/check/as.js --> 
    <!-- inject: ./(bundle)/types/check/isComplies.js -->  
    <!-- inject: ./(bundle)/types/check/isImplements.js -->   
    <!-- inject: ./(bundle)/types/check/isMixed.js --> 

    <!-- inject: ./(bundle)/di/bring.js -->  
    <!-- inject: ./(bundle)/di/include.js -->  
    <!-- inject: ./(bundle)/types/lifecycle/dispose.js -->  
    <!-- inject: ./(bundle)/types/lifecycle/using.js -->   
    <!-- inject: ./(bundle)/attributes/attr.js -->  

    <!-- inject: ./(bundle)/types/support/builder.js -->  
    <!-- inject: ./(bundle)/types/class.js -->  
    <!-- inject: ./(bundle)/types/interface.js -->  
    <!-- inject: ./(bundle)/types/struct.js -->  
    <!-- inject: ./(bundle)/types/enum.js --> 
    <!-- inject: ./(bundle)/types/mixin.js -->

    <!-- inject: ./(bundle)/pubsub/on.js --> 
    <!-- inject: ./(bundle)/pubsub/post.js --> 
    <!-- inject: ./(bundle)/di/container.js -->  
    <!-- inject: ./(bundle)/pubsub/telemetry.js -->    
    <!-- inject: ./(bundle)/aop/aspects.js -->   
    <!-- inject: ./(bundle)/serialization/serializer.js --> 
    <!-- inject: ./(bundle)/tasks/tasks.js --> 
    <!-- inject: ./(bundle)/port/inbuilt/ClientFileLoaderPort.js --> 
    <!-- inject: ./(bundle)/port/inbuilt/ClientModuleLoaderPort.js --> 
    <!-- inject: ./(bundle)/port/inbuilt/ServerFileLoaderPort.js --> 
    <!-- inject: ./(bundle)/port/inbuilt/ServerModuleLoaderPort.js --> 
    <!-- inject: ./(bundle)/port/inbuilt/SettingsReaderPort.js -->
    <!-- inject: ./(bundle)/port/ports.js --> 
    <!-- inject: ./(bundle)/reflection/reflector.js -->    
    <!-- inject: ./(bundle)/types/support/utils.js -->    

    // freeze members
    flair.members = Object.freeze(flair.members);

    // get current file
    let currentFile = (isServer ? __filename : (isWorker ? self.location.href : getLoadedScript('flair.js', 'flair.min.js')));
    
    // info
    flair.info = Object.freeze({
        name: '<<name>>',
        title: '<<title>>',
        desc: '<<desc>>',
        asm: '<<asm>>',
        file: currentFile,
        version: '<<version>>',
        copyright: '<<copyright>>',
        license: '<<license>>',
        lupdate: new Date('<<lupdate>>')
    });  

    // bundled assembly load process 
    let file = which('<<which_file>>');
    _AppDomain.context.current().loadBundledAssembly(file, currentFile, (flair, __asmFile) => {
        // NOTES: 
        // 1. Since this is a custom assembly index.js file, types built-in here does not support 
        //    await type calls, as this outer closure is not an async function

        <<asm_payload>>
    });

    // set settings and config for uniform access anywhere in this closure
    let asm = _getAssembly('[flair]');
    settings = asm.settings();
    config = asm.config();

    // return
    return Object.freeze(flair);
});    
