<span name="header" id="asm_header">

<small><b>
[Flair.js](https://flairjs.com) - True Object Oriented JavaScript
</b><small></br>
Copyright &copy; 2017-2020 Vikas Burman. Distributed under MIT.
</small></small>

</span>
<span name="assembly" id="asm_info">

# <u>flair</u>
<small>
Version 0.64.35 | Thu, 27 Feb 2020 17:10:40 GMT
<br/>

[flair.js](./flair.js) (364k, 97k [minified](flair.min.js), 27k [gzipped](flair.min.js.gz))

Refer [using flair assembly](https://flairjs.com/#/using-flair-assembly) to know more about loading this assembly and working with members of this assembly.
</small>
<br/>

[Namespaces](#namespaces) &nbsp;||&nbsp; [Types](#types) &nbsp;||&nbsp; [Resources](#resources) &nbsp;||&nbsp; [Assets](#assets) &nbsp;||&nbsp; [Routes](#routes)

</span> <span name="ns" id="asm_ns">
</br>

## [Namespaces](#asm_info)
</br>

Namespace | Description
:---|:---
(root) | 
ns1.ns2 | This is the namespace description.


</span>
<span name="types" id="asm_types">
</br>

## [Types](#asm_info)
</br>

Name | Description
:---|:---
**Classes** | 
<a href="#Task">Task</a> | Task base class
**Interfaces** | 
<a href="#IAspect">IAspect</a> | Aspect definition
<a href="#IAttribute">IAttribute</a> | Attribute definition
<a href="#IDisposable">IDisposable</a> | Disposable definition
<a href="#IPortHandler">IPortHandler</a> | Port handler definition
<a href="#IProgressReporter">IProgressReporter</a> | Progress reporter definition



</br>
<h3 id="Task"><a href="#types">Task</a></h3>

**Class** &nbsp; ` public ` ` abstract ` 

_extends_ <a href="a.background">a.background</a> &nbsp; _mixes_ <a href="#d.d">d.d</a> &nbsp; _implements_ <a href="#IProgressReporter">IProgressReporter</a>, <a href="#IDisposable">IDisposable</a> &nbsp; 

***

Task base class



<span id="Task-members">**Members**</span>

Name | Description
:---|:---
**Functions** | 
<a href="#Task-run-array-">run(array)</a>| Task executor


**Remarks**

This class represents a background thread executable task class

Tasks can be executed in blah blah manner and data can be transferred too


**Example**

This example defines how the task code can be executed

```javascript
let task = new Task();
let result = await task.run();
```


**Functions**



<a id="Task-run-array-"></a>[**run(array)**](#Task-members) &nbsp;  ` public ` ` async ` 
> Task executor
>
> **Parameters**
>
> * args &nbsp; ` array ` &nbsp; array as passed to task constructor
>
> **Returns**
>
> ` any ` &nbsp; anything
>
> **Example**
>
> run()
> >
> **Additional Information**
>
> * _Conditional:_ This member is conditional and will be present only when all of the mentioned runtime environmental conditions are met: **server**, **worker**
>


**Additional Information**

* _Since:_ 1.2.23

</br>
<h3 id="IAspect"><a href="#types">IAspect</a></h3>

**Interface** &nbsp; ` public `

***

Aspect definition



<span id="IAspect-members">**Members**</span>

Name | Description
:---|:---
**Functions** | 
<a href="#IAspect-after-object-">after(object)</a>| After advise
<a href="#IAspect-before-object-">before(object)</a> &nbsp; ` static `| Before advise


**Remarks**

TODO: define the before and after relationship for achieving around
TODO: explain structure and usage of ctx object


**Functions**



<a id="IAspect-after-object-"></a>[**after(object)**](#IAspect-members) &nbsp;  ` public `
> After advise
>
> **Parameters**
>
> * ctx &nbsp; ` object ` &nbsp; Context object that is shared across weaving
>
> **Returns**
>
> ` void ` &nbsp; 
>
> **Additional Information**
>
> * _Optional:_ This member is optional and interface's compliance will pass even if this member is not implemented by the class.
>


<a id="IAspect-before-object-"></a>[**before(object)**](#IAspect-members) &nbsp;  ` public ` ` static ` 
> Before advise
>
> **Parameters**
>
> * ctx &nbsp; ` object ` &nbsp; Context object that is shared across weaving
>
> **Returns**
>
> ` void ` &nbsp; 
>


</br>
<h3 id="IAttribute"><a href="#types">IAttribute</a></h3>

**Interface** &nbsp; ` public `

***

Attribute definition



<span id="IAttribute-members">**Members**</span>

Name | Description
:---|:---
**Properties** | 
<a href="#IAttribute-constraints">constraints</a>| An expression that defined the constraints of applying this attribute
<a href="#IAttribute-name">name</a>| Name of the custom attribute
**Functions** | 
<a href="#IAttribute-decorateEvent-string-string-function-">decorateEvent(string, string, function)</a>| Event decorator
<a href="#IAttribute-decorateFunction-string-string-function-">decorateFunction(string, string, function)</a>| Function decorator
<a href="#IAttribute-decorateProperty-string-string-object-">decorateProperty(string, string, object)</a>| Property decorator


**Remarks**

TODO:


**Example**

TODO: example


**Properties**



<a id="IAttribute-constraints"></a>[**constraints**](#IAttribute-members) &nbsp;  ` public `
> ` string ` &nbsp; An expression that defined the constraints of applying this attribute
>
> **Remarks**
>
> Using NAMES, SUFFIXES, PREFIXES, and logical Javascript operator
> 
> NAMES can be:
> type names: class, struct, enum, interface, mixin
> type member names: prop, func, construct, dispose, event
> inbuilt modifier names: static, abstract, sealed, virtual, override, private, protected, readonly, async, etc.
> inbuilt attribute names: promise, singleton, serialize, deprecate, session, state, conditional, noserialize, etc.
> custom attribute names: any registered custom attribute name
> type names itself: e.g., Aspect, Attribute, etc. (any registered type name is fine)
> 
> SUFFIX: A typename must have a suffix (^) e.g., Aspect^, Attribute^, etc. Otherwise this name will be treated as custom attribute name
> 
> PREFIXES can be:
> No Prefix: means it must match or be present at the level where it is being defined
> @: means it must be inherited from or present at up in hierarchy chain
> $: means it either must ne present at the level where it is being defined or must be present up in hierarchy chain
> <name> | @<name> | $<name>
> BOOLEAN Not (!) can also be used to negate:
> !<name> | !@<name> | !$<name>
> 
> NOTE: Constraints are processed as logical boolean expressions and can be grouped, ANDed or ORed as:
> AND: <name1> && <name2> && ...
> OR: <name1> || <name2>
> GROUPING: ((<name1> || <name2>) && (<name1> || <name2>))
> (((<name1> || <name2>) && (<name1> || <name2>)) || <name3>)
> >


<a id="IAttribute-name"></a>[**name**](#IAttribute-members) &nbsp;  ` public `
> ` string ` &nbsp; Name of the custom attribute
>


**Functions**



<a id="IAttribute-decorateEvent-string-string-function-"></a>[**decorateEvent(string, string, function)**](#IAttribute-members) &nbsp;  ` public `
> Event decorator
>
> **Parameters**
>
> * typeName &nbsp; ` string ` &nbsp; Name of the type
> * memberName &nbsp; ` string ` &nbsp; Name of the member
> * member &nbsp; ` function ` &nbsp; Event argument processor function
>
> **Returns**
>
> ` function ` &nbsp; Returns decorated function
>
> **Remarks**
>
> TODO: decorated function must accept ...args and pass-it on (with/without processing) to member function
> >
> **Example**
>
> decorateEvent(typeName, memberName, member)
> >
> **Additional Information**
>
> * _Optional:_ This member is optional and interface's compliance will pass even if this member is not implemented by the class.
>


<a id="IAttribute-decorateFunction-string-string-function-"></a>[**decorateFunction(string, string, function)**](#IAttribute-members) &nbsp;  ` public `
> Function decorator
>
> **Parameters**
>
> * typeName &nbsp; ` string ` &nbsp; Name of the type
> * memberName &nbsp; ` string ` &nbsp; Name of the member
> * member &nbsp; ` function ` &nbsp; Member function to decorate
>
> **Returns**
>
> ` function ` &nbsp; Returns decorated function
>
> **Remarks**
>
> TODO: decorated function must accept ...args and pass-it on (with/without processing) to member function
> >
> **Example**
>
> decorateFunction(typeName, memberName, member)
> >
> **Additional Information**
>
> * _Deprecated:_ hshshs
> * _Optional:_ This member is optional and interface's compliance will pass even if this member is not implemented by the class.
>


<a id="IAttribute-decorateProperty-string-string-object-"></a>[**decorateProperty(string, string, object)**](#IAttribute-members) &nbsp;  ` public `
> Property decorator
>
> **Parameters**
>
> * typeName &nbsp; ` string ` &nbsp; Name of the type
> * memberName &nbsp; ` string ` &nbsp; Name of the member
> * member &nbsp; ` object ` &nbsp; Member descriptor's getter, setter functions
>
> **Returns**
>
> ` object ` &nbsp; Returns decorated getter, setter functions
>
> **Remarks**
>
> Decorated get must call member's get function and decorated set must accept `value` argument and pass it to member's set with or without processing
> >
> **Example**
>
> decorateProperty(typeName, memberName, member)
> >
> **Additional Information**
>
> * _Optional:_ This member is optional and interface's compliance will pass even if this member is not implemented by the class.
>


</br>
<h3 id="IDisposable"><a href="#types">IDisposable</a></h3>

**Interface** &nbsp; ` public `

***

Disposable definition



</br>
<h3 id="IPortHandler"><a href="#types">IPortHandler</a></h3>

**Interface** &nbsp; ` public `

***

Port handler definition



</br>
<h3 id="IProgressReporter"><a href="#types">IProgressReporter</a></h3>

**Interface** &nbsp; ` public `

***

Progress reporter definition





</span>
<span name="resources" id="asm_resources">
</br>

## [Resources](#asm_info)
</br>

Name | Description
:---|:---
master &nbsp; ` Layout ` | &nbsp;
vikas &nbsp; ` Document ` | Test resource document
ns1.ns2.master &nbsp; ` Layout ` | &nbsp;


</span>
<span name="assets" id="asm_assets">
</br>

## [Assets](#asm_info)
Assets are located under: [./flair/](./flair/)

Name | Description
:---|:---
[burman.md](./flair/burman.md)   | 
[ns1.ns2.hello.md](./flair/ns1.ns2.hello.md)   | 
[abc/abc.txt](./flair/abc/abc.txt)   | some information only
[views/l2.html](./flair/views/l2.html)   | 
[views/ns1.ns2.l1.html](./flair/views/ns1.ns2.l1.html)  &nbsp; ` View `  | 


</span>
<span name="routes" id="asm_routes">
</br>

## [Routes](#asm_info)
</br>

Name | Route | Description
:---|:---|:---|
now | {api_v1} /now/:type? &nbsp;  ` get `  | some desc


</span>
<span name="extra" id="asm_extra">
</br>



</span>
<span name="footer" id="asm_footer">

</br>

##
 
<small><small>
Built with [flairBuild](https://flairjs.com/#/flairBuild) (v1) using [fasm](https://flairjs.com/#/fasm) (v1) format.

<div style="text-align: right"><a href="#asm_info">[&nwarr;]</a></div>
</small></small>

</span>