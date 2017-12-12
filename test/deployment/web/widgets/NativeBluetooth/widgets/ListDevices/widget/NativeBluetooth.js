define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",

    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",


], function (declare, _WidgetBase, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, lang, dojoText, dojoHtml, dojoEvent) {
    "use strict";

    return declare("NativeBluetooth.widgets.ListDevices.widget.ListDevices", [ _WidgetBase ], {


        // Internal variables.
        _handles: null,
        _contextObj: null,
        bluetoothEntity: "",
        listMicroflow: "",
        pid: "",

        constructor: function () {
            this._handles = [];

            this.bluetoothListDevices = this.bluetoothListDevices.bind(this);
            this.bluetoothEnabled = this.bluetoothEnabled.bind(this);
            this.getListOfBluetoothDevices = this.getListOfBluetoothDevices.bind(this);
            this.bluetoothEnabledFail = this.bluetoothEnabledFail.bind(this);

        },

        postCreate: function () {
            logger.debug(this.id + ".postCreate");
        },

        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._updateRendering(callback);
        },

        resize: function (box) {
            logger.debug(this.id + ".resize");
        },

        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
        },

        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");
            this.getListOfBluetoothDevices();
            this._executeCallback(callback, "_updateRendering");
        },

        getListOfBluetoothDevices: function(){
            console.log("trying to get a list of devices")
            bluetoothSerial.enable(this.bluetoothEnabled, this.bluetoothEnabledFail);

        },

        bluetoothEnabled: function(){
            console.log("Bluetooth enabled");
            //List the devices and create a list
            this.pid = mx.ui.showProgress("Zoeken naar bluetooth apparaten", true);
            bluetoothSerial.discoverUnpaired(this.bluetoothListDevices, this.bluetoothEnabledFail);
        },

        bluetoothEnabledFail: function(){
            console.log("Bluetooth failed to connect");
        },

        bluetoothListDevices: function(list){
            var self = this;
            console.log("Got a list: " + list);
            var iterator = 1;
            
            for(var i = 0; i < list.length; i++){
                console.log("found device: " + JSON.stringify(list[i]));
                var item = list[i];
                mx.data.create({
                    entity: "Mobile.BluetoothObject",
                    callback: function(obj){
                        obj.set("BClass", item.class);
                        obj.set("UUID", item.id);
                        obj.set("Name", item.name);
                        obj.set("Address", item.address);
                        iterator +=1;
                        obj.addReference("Mobile.BluetoothObject_BluetoothSession", self._contextObj.getGuid());
                        
                        mx.data.commit({
                            mxobj: obj,
                            callback: function(){
                                console.log("Saved it");
                            },
                            error: function(error){
                                console.log("Could not commit the obj with error: " + error);
                            }
                        })
                        if(iterator === list.length){
                            self._contextObj.set("Done", true);
                            mx.data.action({
                                params : {
                                    actionname: self.listMicroflow,
                                    applyto: "selection",
                                    guids: [self._contextObj.getGuid()]
                                },
                                callback: function(){
                                    console.log("Refreshed objects");
                                }
                            })
                            mx.ui.hideProgress(self.pid);
                        }                      
                    }, 
                    error: function(error){
                        console.log("could not create the bluetooth entity: " + error);
                    }
                })
            }            
        },        // Shorthand for executing a callback, adds logging to your inspector
        _executeCallback: function (cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["NativeBluetooth/widgets/ListDevices/widget/NativeBluetooth"]);
