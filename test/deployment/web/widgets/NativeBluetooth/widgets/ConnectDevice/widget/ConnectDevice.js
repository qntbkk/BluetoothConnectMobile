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

    return declare("NativeBluetooth.widgets.ConnectDevice.widget.ConnectDevice", [ _WidgetBase ], {


        // Internal variables.
        _handles: null,
        _contextObj: null,
        bluetoothEntity: "",
        serialDataEntity: "",
        refreshContext: "",
        pid: "",

        constructor: function () {
            this._handles = [];

            this.connectDevice = this.connectDevice.bind(this);
            this.connectSuccessHandler = this.connectSuccessHandler.bind(this);
            this.connectFailHandler = this.connectFailHandler.bind(this);
            this.readData = this.readData.bind(this);
            this.refreshContextObject = this.refreshContextObject.bind(this);
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
            if(this._contextObj){
                console.log("I will connect to a device!");
                this.connectDevice();                
            } else {
                mx.ui.info("Geen context object beschikbaar");
            }
            
        },
        /*
            This function will - based on either UUID or MAC address try to establish a connection with a
            bluetooth device. If this is successful, the sucesshandler is called to trigger the serial data buffer
        */
        connectDevice: function(){
            this.pid = mx.ui.showProgress("Verbinden met apparaat", true);
            var address = this._contextObj.get("Address");
            var uuid = this._contextObj.get("UUID");
            var paired = this._contextObj.get("Paired");
            var connectionId = address !== "" ? address : (uuid !== "" ? uuid : "");
            if(connectionId && connectionId !== ""){
                bluetoothSerial.connect(connectionId, this.connectSuccessHandler, this.connectFailHandler);
            } else {
                mx.ui.info("Er is geen connectie mogelijk met connectionId: " + connectionId);
                mx.ui.hideProgress(this.pid);
            }
        },
        /*
            This function is called if a succesful connection is established between the client device and selected bluetooth
            device. It will trigger the readData function in order to write all data from the buffer to the MBS
        */
        connectSuccessHandler: function(){
            this._contextObj.set("Paired", true);
            mx.ui.info("Verbonden met apparaat: " + this._contextObj.get("Name"));
            mx.ui.hideProgress(this.pid);
            this.readData();
        },
        /*
            This function is called if the application was not able to establish a connection between the client device and the selected
            bluetooth device.
        */
        connectFailHandler: function(error){
            this._contextObj.set("Paired", false);
            mx.ui.warning("Het is niet mogelijk om een verbinding te maken met het bluetooth apparaat, foutmelding: " + error, true);            
            mx.ui.hideProgress(this.pid);
        },
        /*
            This function uses the read method from the bluetoothSerial library to read the data buffer of a bluetooth device
            this data is stored in a newly created Mendix object and refreshes the context object through the refreshContextObject
            method.
        */
        readData: function(){
            var self = this;
            bluetoothSerial.read(function(data){
                console.log("got data from device: " + data);
                if(data === ""){
                    mx.ui.info("Er is geen data beschikbaar van dit apparaat");
                } else {
                    mx.data.create({
                        entity: self.serialDataEntity,
                        callback: function(obj){
                            obj.set("Data", data);
                            obj.addReference("Mobile.BluetoothSerialData_BluetoothObject", self._contextObj.getGuid());
                            self.refreshContextObject();
                        }
                    })
                }
            }, this.connectFailHandler);
        },

        /*
            This function triggers a microflow in the MBS to refresh the context object in order
            to reflect all the UI changes.
        */
        refreshContextObject: function(){
            var self = this;
            mx.data.action({
                params: {
                    actionname: self.refreshContext,
                    applyto: "selection",
                    guids: [self._contextObj.getGuid()]
                },
                callback: function(){
                    console.log("refreshed context");
                }
            })
        }
    });
});

require(["NativeBluetooth/widgets/ConnectDevice/widget/ConnectDevice"]);
