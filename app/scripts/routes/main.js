/*global define*/

define([
    'jquery',
    'backbone',
    'oboe',
    'config/config',
    'collections/operations',
    'models/operation',
    'models/socket',
    'models/timeline',
    'models/centre',
    'collections/notifications',
    'collections/agents',
    'lib/filter_collection',
    'views/login',
    'views/main',
    'views/detail',
    'views/timeline/timeline',
    'views/map/map'
], function ($,
             Backbone,
             Oboe,
             config,
             Operations,
             Operation,
             Socket,
             TimelineModel,
             Centre,
             Notifications,
             Agents,
             filterCollection,
             LoginView,
             MainView,
             DetailView,
             TimelineView,
             MapView) {
    'use strict';
    var
        socket,
        operations = new Operations(),
        agentdispos = new Agents(),
        filtered_operations = new Operations(),
        notifications = new Notifications().watchApplicationCache(),
        Router;
    filterCollection(operations, filtered_operations);

    function askLogin() {

        var v = new LoginView({
            model: {
                login: localStorage.getItem('login'),
                password: localStorage.getItem('password'),
                remember: localStorage.getItem('remember')
            }
        }).render();
        $('#app').empty();
        $('#app').append(v.$el);
        v.on('submit', function (login, password, remember) {

            $.post(config.api.base_url + "login.json",
                {
                    login: login,
                    password: password
                },
                function () {
                    v.setStatus('Authentifié');
                    v.remove();
                    logged();
                },
                'json').fail(function (data) {
                    if (data.responseJSON && data.responseJSON.status)
                        v.setStatus(data.responseJSON.status);
                    else
                        v.setStatus(data.statusText + ' - Etes vous connecté à Internet ? ');
                    v.reset();
                });
            if (remember) {
                localStorage.setItem('login', login);
                localStorage.setItem('password', password);
            } else {
                localStorage.setItem('login', '');
                localStorage.setItem('password', '');
            }
            localStorage.setItem('remember', remember);
        });
    }

    function logged() {
        /*
         * socket connection should be done before getting operation list
         * to avoid missing events
         * */
        socket.connect();
        socket.pause();
        //start router
        $('#app').empty();
        new Router({operations: filtered_operations});
        Backbone.history.start();
        notifications.add({
            level: 'info',
            title: 'Téléchargement des opérations en cours  ',
            body: 'En attente de réponse du serveur',
            icon: 'images/fire.png',
            tag: 'operations-loading'
        });
        //load operations via http , to leverage gzip compression
        initOperations();
    }

    var nbEssaiInitOperations = 0;

    function initOperations() {
        nbEssaiInitOperations++;
        var nb_operations = null, nb = 0, start = Date.now();

        agentdispos.autoLoadFromDispo(15000);
        filtered_operations.trigger('loadStart')
        operations.reset();

        Oboe(config.api.base_url + "operation/current.json?" + Math.random())
            .node('operations.*', function (operation) {
                nb++;
                filtered_operations.trigger('loadProgress', nb);
                operations.processAddEvent('add:operations', operation);
                notifications.add({
                    level: 'info',
                    title: 'Téléchargement des opérations en cours  ',
                    body: nb+ ' téléchargées'+(nb_operations ? ' sur ' + nb_operations :''),
                    icon: 'images/fire.png',
                    tag: 'operations-loading'
                });
            })
            .node('nb_operations', function (got_nb) {
                nb_operations = got_nb;
            })
            .done(function () {
                operations.trigger('loaded');
                notifications.add({
                    level: 'info',
                    title: 'Téléchargement des opérations en cours  ',
                    body: nb_operations+' opération(s) téléchargées en '+Math.round((Date.now() -start)/100)/10 +' secondes',
                    icon: 'images/fire.png',
                    tag: 'operations-loading',
                    duration:1500
                });
                socket.resume();
            })
            .fail(function (e) {
                if(nb != nb_operations){
                    notifications.add({
                        level: 'danger',
                        title: 'Téléchargement des opérations en cours  ',
                        body: 'Problème de communication avec le serveur, nouvel essai dans 2 secondes',
                        icon: 'images/fire.png',
                        tag: 'operations-loading'
                    });
                    setTimeout(initOperations, 2000);

                }

            });
        return true;
    }

    Backbone.on('delete_poly', function (poly) {
        $.ajax({
            url: config.api.base_url + 'poly',
            data: {
                id: poly.id
            },
            type: 'DELETE'
        });
    });
    Backbone.on('new_poly', function (poly) {
        $.ajax({
            url: config.api.base_url + 'poly',
            data: {
                lats: JSON.stringify(poly.lats),
                lngs: JSON.stringify(poly.lngs),
                color: poly.color,
                pattern: poly.pattern,
                operation_id: poly.operation_id
            },
            type: 'PUT'
        })
    });
    Router = Backbone.Router.extend({
        initialize: function (opts) {
            var that = this;
            var operations = this.operations = opts.operations;
            this.mainView = new MainView({el: '#app', socket: socket, notifications: notifications}).render();
            this.mapView = new MapView({collection: operations, el: '#map'}).render();

            this.detailView = new DetailView({
                collection: operations,
                agentdispos: agentdispos,
                el: '#details'
            }).render();
            this.timelineView = new TimelineView({el: '#timeline'}).render();
            this.models = {};
        },
        _clean: function () {
           // _.invoke(_.values(this.models), 'destroy');
            this.models = {};
        },
        _showTimeline: function (operation) {
            if (
                this.models.timeline
                && operation
                && operation.id == this.models.timeline.get('operation').id
            ) {
                //same operation nothing changed
                return;
            }

            this.models.timeline = new TimelineModel({operation: operation});
            this.timelineView.changeModel(this.models.timeline).render().show();

        },

        operationsMap: function (operation_id) {
            var operation = null,that = this;
            if (operation_id && !(operation = this.operations.get(operation_id))) {
                return this.navigate('operations/context', {trigger: true})
            }

            if (operation_id) {
                this.mainView.setPath([
                    {
                        url: '#operation/' + operation_id,
                        title: operation.get('city') + ' - ' + operation.get('nature_longue')
                    },
                    {title: 'Carte'}
                ]);
            } else {
                this.mainView.setPath([
                    {
                        url: '#operations/contexte',
                        title: 'Opérations'
                    },
                    {title: 'Carte'}
                ]);
            }
            $('body').addClass('show-map');

            this.detailView.setTarget({
                operation:operation,
                tab:'carte'
            });
            setTimeout(function(){
                that.mapView.showOp(operation_id);//.autoFit();
            },0)
        },

        operationsContext: function () {
            var that = this;
            $('body').removeClass('show-map');
            this._clean();
            this.mainView.setPath([{title: 'Opérations'}]);
            this.timelineView.removeModel().hide();
            this.detailView.setTarget({
                operation:null
            });
            setTimeout(function(){
                that.mapView.showOp();
            },0);

        },
        operationContext: function (operation_id) {
            $('body').removeClass('show-map');
            var operation;

            if (!(operation = this.operations.get(operation_id))) {
                return this.navigate('operations/context', {trigger: true})
            }

            this._clean();
            this.mainView.setPath([
                {
                    title: operation.get('type_family') + ' - ' + operation.get('city')
                }
            ]);
            this._showTimeline(operation);
            this.mapView.showOp(operation_id);//.autoFit();

            this.detailView.setTarget({
                operation:operation,
                tab:null
            });
        },
        operationTab: function (operation_id, tab) {
            $('body').removeClass('show-map');
            var operation;

            if (!(operation = this.operations.get(operation_id))) {
                return this.navigate('operations/context', {trigger: true})
            }

            this.mainView.setPath([
                {
                    url: '#operation/' + operation_id,
                    title: operation.get('type_family') + ' - ' + operation.get('city')
                },
                {title: tab}
            ]);
            this._clean();
            this._showTimeline(operation);
            this.mapView.showOp(operation_id);//.autoFit();
            console.log(' operation tab ',operation,tab )
            this.detailView.setTarget({
                operation:operation,
                tab:tab
            });
        },
        outils: function () {
            $('body').removeClass('show-map');
            this._clean();
            this.mainView.setPath([{title: 'Outils'}]);
            this.timelineView.removeModel().hide();

            this.detailView.setTarget({
                operation:null,
                tab:'outils'
            });

        },
        dispos: function () {
            $('body').removeClass('show-map');
            this._clean();
            this.mainView.setPath([{title: 'Disponibilités'}]);
            this.timelineView.removeModel().hide();

            this.detailView.setTarget({
                operation:null,
                tab:'dispos'
            });


        },
        disposCentre: function (code_centre, label_centre) {
            $('body').removeClass('show-map');
            this._clean();
            this.mainView.setPath([
                {title: 'Disponibilités', url: "#dispos"},
                {title: label_centre || code_centre}
            ]);
            this.models.centre = new Centre({id:code_centre,label:label_centre} )

            this.detailView.setTarget({
                operations:null,
                centre:this.models.centre,
                tab: 'disposcentre'
            });

            this.models.timeline = new TimelineModel({centre: this.models.centre});
            this.timelineView.removeModel().hide();

            //this.timelineView.changeModel(this.models.timeline).render().show();

        },
        mapage: function () {
            $('body').removeClass('show-map');
            this._clean();
            this.mainView.setPath([
                {title: 'Ma page'}
            ]);

            this.timelineView.removeModel().hide();

            this.detailView.setTarget({
                operation:null,
                tab:'mapage'
            });

        },
        logout: function () {
            var router = this;
            $.get('/logout').then(function (data) {
                console.log(data);

                router.navigate('/')
                document.location.reload()
            });
        },
        routes: {
            "operations/contexte": "operationsContext",
            "operations/messages": "operationsMessages",
            "operations/moyens": "operationsVehicles",
            "operations/carte": "operationsMap",
            "operation/:id": "operationContext",
            "operation/:id/contexte": "operationContext",
            "operation/:id/carte": "operationsMap",
            "operation/:id/:tab(/:item)": "operationTab",
            "outils": "outils",
            "dispos/:code_centre/(:label)": "disposCentre",
            "dispos": "dispos",
            "mapage": "mapage",
            "logout": "logout",
            "*actions": "operationsContext"/*default*/
        }
    });


    return {
        initialize: function () {
            socket = new Socket();
            operations.fromSocket(socket);
            notifications
                .watchOperations(filtered_operations)
                .watchSocket(socket);
            console.log('initialized')

            $('#app  h1').html('Vérification de la connexion internet </p>');
            //notifications = new Notifications().watchOperations(filtered_operations);

            if (test_already_logged.done) {
                pendulum.pause();

                if (test_already_logged.logged) {
                    logged()
                } else {
                    askLogin();
                }
            } else {
                $('#requirejs-loading-panel').hide();
                test_already_logged.xhr.addEventListener("load", function () {
                    var json;
                    try {
                        json = JSON.parse(this.responseText)
                    } catch (e) {
                        pendulum.pause();

                        askLogin();
                        return;
                    }
                    pendulum.pause();

                    if (json.authenticated) {
                        console.log(json);
                        logged()
                    } else {
                        askLogin();
                    }

                }, false);
                test_already_logged.xhr.addEventListener("error", function () {
                    askLogin();
                }, false);
                test_already_logged.xhr.addEventListener("abort", function () {
                    askLogin();
                }, false);
            }
            //ping session to maintain it

            function checkConnection() {
                $.getJSON(config.api.base_url + 'login.json').done(function (data, statusText, xhr) {
                    if (xhr.status == 403) { //session expired on the server
                        if (socket) {
                            socket.disconnect();
                        }
                    } else {
                    }
                });
            }


            socket.on('reconnecting', checkConnection);
            setInterval(checkConnection, 1000 * 60 * 2); //just to keep session alive

        }
    };
//

})
;
