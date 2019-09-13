define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/dom-class",
    "dojo/_base/lang",
    "dojo/query",
    "dojo/on",
    "dojo/date/locale",
    "dojo/text!BluetoothConnectMobile/widgets/SyncDevice/widget/template/SyncDevice.html"
], function (declare, _WidgetBase, _TemplatedMixin, dojoClass, dojoLang, dojoQuery, on, locale, widgetTemplate) {
    "use strict";

    return declare("BluetoothConnectMobile.widgets.SyncDevice.widget.SyncDevice", [ _WidgetBase, _TemplatedMixin ], {

        templateString: widgetTemplate,
        // Dom elememnts
        theButton: null,

        // Internal variables.
        _handles: null,
        _contextObj: null,
        bluetoothEntity: "",
        serialDataEntity: "",
        refreshContext: "",
        pid: "",

        constructor: function () {
            this._handles = [];
            bluetoothSerial.enable();
            this.connectDevice = this.connectDevice.bind(this);
            this.connectSuccessHandler = this.connectSuccessHandler.bind(this);
            this.connectFailHandler = this.connectFailHandler.bind(this);
            this.readData = this.readData.bind(this);
            this.refreshContextObject = this.refreshContextObject.bind(this);
        },

        postCreate: function () {
            logger.debug(this.id + ".postCreate");
            this.theButton.innerHTML = "Sync Device" ;
            on(this.theButton, "click", dojoLang.hitch(this, this.connectDevice));
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

        

        _updateRendering: function(callback) {
            if (this._contextObj !== null) {
            } else {
            }
            bluetoothSerial.disconnect();
            // The callback, coming from update, needs to be executed, to let the page know it finished rendering
            this._executeCallback(callback, "_updateRendering");
        },
        _executeCallback: function(cb, from) {
            if (cb && typeof cb === "function") {
                cb();
            }
        },


        /*
            This function will - based on either UUID or MAC address try to establish a connection with a
            bluetooth device. If this is successful, the sucesshandler is called to trigger the serial data buffer
        */
        connectDevice: function(){

            var self = this;

            self.pid = mx.ui.showProgress("connecting to the device ...", true);
            var address = self._contextObj.get("address");
            var uuid = self._contextObj.get("UUID");
            var paired = self._contextObj.get("Paired");
            var connectionId = address !== "" ? address : (uuid !== "" ? uuid : "");

            function lazyLoad() {
                if(connectionId && connectionId !== ""){
                    return new Promise(resolve => {
                        setTimeout(() => {
                            resolve(
                                bluetoothSerial.enable(),
                                bluetoothSerial.subscribe('\n', function(data) {
                                    alert(data);
                                    }, function(error){
                                    console.log("could not create data: " + error);
                                    }   
                                ),
                                bluetoothSerial.connect(connectionId, self.connectSuccessHandler, self.connectFailHandler)
                            );
                        },3000)
                    })
                }else {
                    mx.ui.info("Connection id: " + connectionId);
                    mx.ui.hideProgress(self.pid);
                    bluetoothSerial.disconnect();
                }
            };

            async function lazyConnect() {
                await lazyLoad();
            };

            lazyConnect();
            
        },
        /*
            This function is called if a succesful connection is established between the client device and selected bluetooth
            device. It will trigger the readData function in order to write all data from the buffer to the MBS
        */
        connectSuccessHandler: function(){
            var self = this;
            
            self._contextObj.set("Paired", true);
            mx.ui.info("Connect Success: " + self._contextObj.get("name"));
            mx.ui.hideProgress(self.pid);

            function lazyLoad() {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(
                            self.readData()
                        );
                    }, 5000)
                })
            };

            async function lazyRead() {
                await lazyLoad();
            };

            lazyRead();
        },
        /*
            This function is called if the application was not able to establish a connection between the client device and the selected
            bluetooth device.
        */
        connectFailHandler: function(error){
            this._contextObj.set("Paired", false);
            mx.ui.warning("Failed at connect handler: " + error, true);            
            mx.ui.hideProgress(this.pid);
            bluetoothSerial.disconnect();
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
                    mx.ui.info("Data is empty, need to connect again");
                    bluetoothSerial.disconnect();
                } else {
                    return new Promise((resolve, reject) => {
                        mx.data.create({
                            entity: self.serialDataEntity,
                            callback: function(obj){
                                obj.set("Data", data);
                                obj.addReference("MyFirstModule.SerialData_BluetoothDevice", self._contextObj.getGuid());
                                
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
                                self.refreshContextObject();
                                bluetoothSerial.disconnect();
                            },
                            error: function(error){
                                console.log("could not create data: " + error);
                                reject(error);
                                bluetoothSerial.disconnect();
                            }
                        });
                    });
                    
                }
            }, this.connectFailHandler);
        },

        /*
            This function triggers a microflow in the MBS to refresh the context object in order
            to reflect all the UI changes.
        */
        refreshContextObject: function(){
            var self = this;
            return new Promise((resolve, reject) => {
                mx.data.action({
                    params: {
                        actionname: self.refreshContext,
                        applyto: "selection",
                        guids: [self._contextObj.getGuid()]
                    },
                    callback: function(){
                        console.log("refreshed context");
                        resolve();
                    },
                    error: function(error){
                        console.log("could not refresh microflow: " + error);
                        reject(error);
                        bluetoothSerial.disconnect();
                    }
                })
            });
            
        }
    });
});

require(["BluetoothConnectMobile/widgets/SyncDevice/widget/SyncDevice"]);
