var ab = require('../lib/express-ab');
var assert = require('assert');
var express = require('express');
var request = require('supertest');

describe('weighted', function () {
    function setReqVarMiddleware(req, res, next) {
        req.ab = {
            random: req.get('ab-random'),
            weightSum: 0
        };
        next();
    }

    function skipRouteMiddleware(req, res, next) {
        next('route');
    }

    var app = express();
    var abTest = ab.test('unit-test');

    app.get('/', setReqVarMiddleware, abTest(null, 0.2), function (req, res) {
        res.send('variantA');
    });

    app.get('/', setReqVarMiddleware, abTest(null, 0.8), function (req, res) {
        res.send('variantB');
    });

    app.get('/random', abTest(null, 1), function (req, res) {
        res.send(req.ab);
    });

    describe('variant selection', function () {
        it('should set ab object on req', function (done) {
            request(app)
                .get('/random')
                .expect(function (res) {
                    assert('random' in res.body);
                    assert('weightSum' in res.body);
                })
                .end(done);
        });

        it('should select route A', function (done) {
            request(app)
                .get('/')
                .set('ab-random', 0.11)
                .expect(200)
                .expect('variantA', done);
        });

        it('should select route B', function (done) {
            request(app)
                .get('/')
                .set('ab-random', 0.42)
                .expect(200)
                .expect('variantB', done);
        });
    });

    describe('fallthrough', function () {

        app.get('/fallthrough', skipRouteMiddleware, setReqVarMiddleware, abTest(null, 0.5), function (req, res) {
            res.send('variantA');
        });

        app.get('/fallthrough', setReqVarMiddleware, abTest(null, 0.5), function (req, res) {
            res.send('variantB');
        });

        it('should fallthrough if first is skipped', function (done) {
            request(app)
                .get('/fallthrough')
                .set('ab-random', 0.42)
                .expect(200)
                .expect('variantB', done);
        });
    });
});