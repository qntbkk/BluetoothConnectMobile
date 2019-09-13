define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/dom-class",
    "dojo/_base/lang",
    "dojo/query",
    "dojo/on",
    "dojo/date/locale",
    "dojo/text!BluetoothConnectMobile/widgets/AllDevices/widget/template/AllDevices.html"
], function (declare, _WidgetBase, _TemplatedMixin, dojoClass, dojoLang, dojoQuery, on, locale, widgetTemplate) {
    "use strict";

    return declare("BluetoothConnectMobile.widgets.AllDevices.widget.AllDevices", [ _WidgetBase, _TemplatedMixin ], {


        templateString: widgetTemplate,
        // Internal variables.
        theButton: null,
        _handles: null,
        _contextObj: null,
        bluetoothEntity: "",
        listMicroflow: "",
        pid: "",
        pairedDone: false,
        unPairedDone: false,

        constructor: function() {
            this._handles = [];
            this.getDevices = this.getDevices.bind(this);
            this.getUnpairedDevices = this.getUnpairedDevices.bind(this);            
            this.mapUnpairedDevices = this.mapUnpairedDevices.bind(this);
            this.getPairedDevices = this.getPairedDevices.bind(this);
            this.mapPairedDevices = this.mapPairedDevices.bind(this);
            this.bluetoothEnabledFail = this.bluetoothEnabledFail.bind(this);
            this.newBluetoothObject = this.newBluetoothObject.bind(this);
            this.resolvePromises = this.resolvePromises.bind(this);
          },

        postCreate: function () {
            logger.debug(this.id + ".postCreate");
            this.theButton.innerHTML = "All Devices" ;
            on(this.theButton, "click", dojoLang.hitch(this, this.getDevices));
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

        // _updateRendering: function (callback) {
        //     logger.debug(this.id + "._updateRendering");
        //     if(this._contextObj && !this._contextObj.get("DisableConnect")){
        //         this.pairedDone = false;
        //         this.unPairedDone = false;
        //         this.getDevices();
        //     }
        // },

        _updateRendering: function(callback) {
            if (this._contextObj !== null) {
            } else {
            }
            // The callback, coming from update, needs to be executed, to let the page know it finished rendering
            this._executeCallback(callback, "_updateRendering");
        },

        _executeCallback: function(cb, from) {
            if (cb && typeof cb === "function") {
              cb();
            }
          },

        /*  
            this function will start the bluetooth hardware on the device and when enabled
            starts the process of finding paired and unpaired devices 
        */
        getDevices: function(){
            console.log("trying to get a list of devices");
            var self = this;
            self.pid = mx.ui.showProgress("get devices", true);
            bluetoothSerial.enable(function(){
                console.log("Bluetooth enabled");
                self.getPairedDevices();
                self.getUnpairedDevices();
            }, function(error){
                self.bluetoothEnabledFail(error);
            });
        },

        /* Simple function that will show an error */
        bluetoothEnabledFail: function(error){
            mx.ui.info("Bluetooth enable failed: " + error);
            if(this.pid){
                mx.ui.hideProgress(this.pid);
            }
            console.log("Bluetooth failed to connect");
        },
        /* 
            This function will fire the Cordova plugin to search for unpaired devices. if they are found the mapUnpairedDevices handler is called
            Otherwise the bluetoothEnabledFail hanlder is called
        */
        getUnpairedDevices: function(){
            //List the devices and create a list
            bluetoothSerial.discoverUnpaired(this.mapUnpairedDevices, this.bluetoothEnabledFail);
        },

        /*
            This function will fire the Cordova plugin to search for paired devices. If they are found the mapPairedDevices handler is called
            Otherwise the bluetoothEnabledFail handler is called

            BE AWARE: this will also find paired devices that are not in the vicinity of the client device
        */
        getPairedDevices: function(){
            console.log("paired devices");
            bluetoothSerial.list(this.mapPairedDevices, this.bluetoothEnabledFail);
        },

        /* 
            This function will get a list of found devices (empty if there are no devices found) from the discoverUnpaired method
            It will map the devices and create a BluetoothObject (given by the Mendix Modeler) and set its attributes

            Since the create object method of mendix is asynchronous, the method is handled as a Promise to be resolved when all the
            devices are mapped
        */
        mapUnpairedDevices: function(list){
            var self = this;
            var guidList = list.map((item, index) => {
                return this.newBluetoothObject(item, false)
                    .then((result) => {
                        return result.getGuid();
                    }).catch((error) => {
                        console.log("Got error: " + error);
                        return null;
                    });
            });
            this.resolvePromises(guidList, "UNPAIRED");
        },
        /* 
            This function will get a list of found devices (empty if there are no devices found) from the list method
            It will map the devices and create a BluetoothObject (given by the Mendix Modeler) and set its attributes

            Since the create object method of mendix is asynchronous, the method is handled as a Promise to be resolved when all the
            devices are mapped
        */       
        mapPairedDevices: function(list){
            var self = this;
            var guidList = list.map((item, index) => {
                return this.newBluetoothObject(item, true)
                    .then((result) => {
                        return result.getGuid();
                    }).catch((error) => {
                        console.log("Got error for paired device: " + error);
                        return null;
                    });
            });
            this.resolvePromises(guidList, "PAIRED");
        },

        /*
            This function will fire when all promises of a given array of promises are finished. In this case the mapping of the
            devices to mendix objects. If they are all finished, a refresh microflow is triggered in the MBS
        */
        resolvePromises: function(array, type){
            var self = this;
            Promise.all(array).then((result) => {
                console.log("Resolving " + type + " promises");
                mx.data.action({
                    params: {
                        actionname: self.listMicroflow,
                        applyto: "selection",
                        guids: [self._contextObj.getGuid()]
                    }, callback: function(){
                        console.log("Refreshed object");
                        if(type === "UNPAIRED"){
                            self.unPairedDone = true;
                        }
                        if(type === "PAIRED"){
                            self.pairedDone = true;
                        }

                        if(self.unPairedDone && self.pairedDone){
                            mx.ui.hideProgress(self.pid);
                        }
                    }
                })
            });
        },

        /*
            This function creates a mendix object for a device given by either one of the map functions.
            Based on wether or not it is a paired device, it will set that value as well.
        */
        newBluetoothObject: function(device, paired){
            var self = this;
            return new Promise((resolve, reject) => {
                mx.data.create({
                    entity: "MyFirstModule.BluetoothDevice",
                    callback: function(obj){
                        obj.set("_class", device.class);
                        obj.set("UUID", device.id);
                        obj.set("_id", device.id);
                        obj.set("name", device.name !== "" ? device.name : device.id);
                        obj.set("address", device.address);
                        obj.set("Paired", paired);
                        obj.addReference("MyFirstModule.Session", self._contextObj.getGuid());
                        mx.data.commit({
                            mxobj    : obj,
                            callback : function() {
                                console.log("Object committed");
                            },
                            error : function(err) {
                                console.log("Error occurred attempting to commit " + err);
                            }
                        });
                        resolve(obj);

                    }, 
                    error: function(error){
                        console.log("could not create the bluetooth entity: " + error);
                        reject(error);
                    }
                })
            });
        },
        
    });
});

require(["BluetoothConnectMobile/widgets/AllDevices/widget/AllDevices"]);
