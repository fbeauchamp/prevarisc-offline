/*global require*/
'use strict';

require.config({
    shim: {
        bootstrap: {
            deps: [
                'jquery'
            ]
        },
        datatables: {
            deps: [
                'jquery'
            ]
        }
    },
    paths: {
        jquery: '../bower_components/jquery/dist/jquery',
        requirejs: '../bower_components/requirejs/require',
        bootstrap: '../bower_components/bootstrap/dist/js/bootstrap',
        datatables: '../bower_components/datatables/media/js/jquery.dataTables',
        mustache: '../bower_components/mustache/mustache',
        lodash: '../bower_components/lodash/lodash'
    }
});

require([
    'jquery',
    'lodash',
    'mustache',
    'lib/cache/cache',

    'text!templates/etablissement.mustache.html',
    'bootstrap',
    'datatables'
], function ($, _, Mustache, Cache, template) {

    function loadAll(current_page, accumulator, cb) {




        $
            .getJSON('./etablissements.json?count=1000&page=' + current_page)
            .then(function (json) {
                accumulator = accumulator.concat(json.response.results);
                console.log(json.response.results.length);
                if (json.response.results.length === 1000) {
                    loadAll(current_page + 1, cb)
                } else {
                    cb(null, accumulator);
                }
            })
    }

    //loadAll(0, [], function (err, etablissments) {
     //   console.log(etablissments)
   // });
function loadFakeAll(cb){
    if( localStorage.getItem('etablissements')){
        console.log('from cache')
        cb(null,JSON.parse(localStorage.getItem('etablissements')));
        return ;
    }
    return $.getJSON('./fake_data/etablissements.json')
        .then(function(json){
            var etablissements = json.response.results;
            localStorage.setItem('etablissements', JSON.stringify(etablissements))
            cb(null,etablissements);
        })

}


    function loadOne(id, cb){
        var sent = false;
        //offline first
        if( localStorage.getItem('etablissement/'+id)){
            console.log('from cache')
            sent = true;
            cb(null,JSON.parse(localStorage.getItem('etablissement/'+id)));
        }
        var etablissement ={};
        $
            .getJSON('./fake_data/etablissement.json?id=' + id)
            .then(function(json){
                etablissement = json.response;
                return $
                    .getJSON('../fake_data/etablissement/pieces_jointes.json?id=' + id)
            }).then(function(json) {

                etablissement.pieces_jointes = json.response;
                localStorage.setItem('etablissement/'+id,JSON.stringify(etablissement));
                if(!sent)
                    cb(null,etablissement);
                /*pj.ID_PIECEJOINTE + pj.EXTENSION_PIECEJOINTE*/
            })
    }


    function loadAttachment(eta_id, att_id , cb ){
        var src = './fake_data/' + att_id;

        Cache.get(src, function(err,dataUrl){
            if (!err && dataUrl ) {
                 cb(null,dataUrl)
                return ;
            }

            console.log(' download pj ')

            //Mais putain, comme j'aimerai avoir ces progress avec du jquery plutot que de me faire chier avec xhr
            var xhr = new XMLHttpRequest();
            xhr.open('GET', src, true);
            xhr.responseType = 'blob';
            xhr.onloadstart = function () {
                //first octets back from server
            };
            xhr.onprogress = function (pe) {
                console.log(' progress id ', Math.floor(pe.loaded * 100 / pe.total))

            };
            xhr.onload = function (e) {
                if (this.status == 200) {
                    var blob = this.response;
                    var dataUrl = URL.createObjectURL(blob);
                    Cache.store(src, blob, function (err, res) {
                        if (err) {
                            console.log(err)
                        } else {

                            console.log(src, 'cached')
                        }
                        cb(null,dataUrl);
                    })
                }
            };
            xhr.onerror = function () {
            };
            xhr.send();
        })
    }

    var etablissements = null;
    loadFakeAll(function(err, etablissements){

        $('#datatable').dataTable({
            data:etablissements,
            columns: [
                {data: 'ID_ETABLISSEMENT', title: 'id'},
                {data: 'LIBELLE_ETABLISSEMENTINFORMATIONS', title: 'label'},
                {data: 'LIBELLE_RUE', title: 'rue'},
                {data: 'LIBELLE_COMMUNE_ADRESSE_DEFAULT', title: 'commune'}
            ]
        })
            .find('tbody').on('click', 'tr', function () {
                var id = $('td', this).eq(0).text();
                $('#datatable').parents('.dataTables_wrapper').hide();
                $('#etablissement').show();
                loadOne(id,function(err,etablissement){
                    console.log(etablissement);
                    $('#etablissement').html(Mustache.render(template, etablissement));
                    $('#etablissement a.download').click(function(){
                        var $this = $(this);
                        if(!$this.data('loading') || !$this.data('loaded')){
                            $this.data('loading', true)
                            loadAttachment(id,$this.data('attachment-id'), function(err,dataurl){
                                $this.data('loaded', true)
                                $this.attr('href',dataurl);
                                window.open(dataurl)

                            })
                        }

                    })
                })
            });
    })


});
