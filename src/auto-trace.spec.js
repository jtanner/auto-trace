import * as autoTrace from './auto-trace.js';

describe('auto-trace.js', () => {
	
	let middlewareSpy, middlewareFun, foo;

	beforeEach(() => {
		foo = {
			middlewareSpy: (asyncErr, syncErr) => {
				return syncErr;
			}
		}
		spyOn(foo, 'middlewareSpy').and.callThrough();

		middlewareFun = (asyncErr) => foo.middlewareSpy.bind(null, asyncErr);
		autoTrace.removeAllGlobalMiddlewares();
		autoTrace.addGlobalMiddleware(middlewareFun);
	});

	describe('asyncStacktrace', () => {
		it('should create a new error where none is given then call callback', () => {
			const callback = jasmine.createSpy('callback');
			autoTrace.asyncStacktrace(callback)();
			expect(callback).toHaveBeenCalledWith(jasmine.any(Error));
		});
		it('should wrap non-errors in errors then call callback', () => {
			const callback = jasmine.createSpy('callback');
			autoTrace.asyncStacktrace(callback)('non-error');
			expect(callback).toHaveBeenCalledWith(Error('non-error'));
		});
		it('should call callback without wrapping errors', () => {
			const callback = jasmine.createSpy();
			const err = new Error('error');
			autoTrace.asyncStacktrace(callback)(err);
			expect(callback).toHaveBeenCalledWith(err);
		});
		it('should wrap non-errors in errors and attach extraContext', () => {
			const callback = jasmine.createSpy('callback');
			const extraContext = {info: 'Lookout', user: {id:32, name:'Oli'}};
			autoTrace.asyncStacktrace(callback, extraContext)('non-error');
			expect(callback).toHaveBeenCalledWith(Error(`non-error Extra Context: {"info":"Lookout","user":{"id":32,"name":"Oli"}}`));
		});
		it('should call middlewares with async and sync errs', () => {
			const callbackSpy = jasmine.createSpy();
			const err = new Error('error');
			const expectedAsyncError = new Error('async');
			const expectedSyncError = new Error('sync');
			let outputAsyncError;
			let outputSyncError;
			//Add new middleware
			middlewareFun = asyncErr => {
				outputAsyncError = new Error('async');
				return syncErr => {
					outputSyncError = new Error('sync');
					return syncErr;
				}
			}
			autoTrace.removeAllGlobalMiddlewares();
			autoTrace.addGlobalMiddleware(middlewareFun);

			autoTrace.asyncStacktrace(callbackSpy)(err);
			expect(callbackSpy).toHaveBeenCalledWith(err);
			expect(expectedAsyncError).toEqual(expectedAsyncError);
			expect(expectedSyncError).toEqual(expectedSyncError);
		});
		it('should apply multiple middlewares and modify the error accordingly', () => {
			const callbackSpy = jasmine.createSpy();
			const err = new Error('error');

			//Add new middleware
			const middlewareFunc1 = asyncErr => {
				const msg1 = '1a';
				return syncErr => {
					const outputSyncError = syncErr;
					outputSyncError.message += ` ${msg1} 1b`
					return outputSyncError;
				}
			}
			const middlewareFunc2 = asyncErr => {
				const msg1 = '2a';
				return syncErr => {
					const outputSyncError = syncErr;
					outputSyncError.message += ` ${msg1} 2b`
					return outputSyncError;
				}
			}
			const middlewareFunc3 = asyncErr => {
				const msg1 = '3a';
				return syncErr => {
					const outputSyncError = syncErr;
					outputSyncError.message += ` ${msg1} 3b`
					return outputSyncError;
				}
			}
			autoTrace.addGlobalMiddleware(middlewareFunc1);
			autoTrace.addGlobalMiddleware(middlewareFunc2);
			autoTrace.addGlobalMiddleware(middlewareFunc3);

			autoTrace.asyncStacktrace(callbackSpy)(err);

			expect(callbackSpy).toHaveBeenCalledWith(Error('error 1a 1b 2a 2b 3a 3b'));
		});
	});

	describe('throwAsyncStacktrace', () => {
		it('should create a new error where none is given then throw', () => {
			expect( () => autoTrace.throwAsyncStacktrace()()).toThrow(jasmine.any(Error));
		});
		it('should wrap non-errors in errors then throw', () => {
			expect( () => autoTrace.throwAsyncStacktrace()('non-error')).toThrow(Error('non-error'));
		});
		it('should throw without wrapping errors', () => {
			const err = new Error('error');
			expect( () => autoTrace.throwAsyncStacktrace()(err)).toThrow(err);
		});
		it('should wrap non-errors in errors and attach extraContext', () => {
			const extraContext = {info: 'Lookout', user: {id:32, name:'Oli'}};
			expect(() => autoTrace.throwAsyncStacktrace(extraContext)('non-error')).toThrow(Error(`non-error Extra Context: {"info":"Lookout","user":{"id":32,"name":"Oli"}}`));
		});
		it('should call middleware with async and sync error then throw', () => {
			const err = new Error('error');
			expect(() => autoTrace.throwAsyncStacktrace()(err)).toThrow(err);
			expect(foo.middlewareSpy).toHaveBeenCalledWith(err, err);
		});
		it('should middlewares should execute for both async and sync errors', () => {
			const err = new Error('error');
			const expectedAsyncError = new Error('async');
			const expectedSyncError = new Error('sync');
			let outputAsyncError;
			let outputSyncError;
			//Add new middleware
			const middlewareFunc = asyncErr => {
				outputAsyncError = new Error('async');
				return syncErr => {
					outputSyncError = new Error('sync');
					return syncErr;
				}
			}
			autoTrace.removeAllGlobalMiddlewares();
			autoTrace.addGlobalMiddleware(middlewareFunc);

			expect(() => autoTrace.throwAsyncStacktrace()(err)).toThrow(err)
			expect(expectedAsyncError).toEqual(expectedAsyncError);
			expect(expectedSyncError).toEqual(expectedSyncError);
		});
		it('should apply multiple middlewares to error then throw', () => {
			const err = new Error('error');
			
			//Add second middleware
			const foo2 = {
				middlewareSpy: (asyncErr, syncErr) => {
					return syncErr;
				}
			}
			spyOn(foo2, 'middlewareSpy').and.callThrough();
			const middlewareFun2 = (asyncErr) => foo2.middlewareSpy.bind(null, asyncErr);

			autoTrace.addGlobalMiddleware(middlewareFun2);

			expect(() => autoTrace.throwAsyncStacktrace()(err)).toThrow(err);
			expect(foo.middlewareSpy).toHaveBeenCalledWith(err, err);
			expect(foo2.middlewareSpy).toHaveBeenCalledWith(err, err);
		});
		it('should apply multiple middlewares and modify the error accordingly', () => {
			const err = new Error('error');

			//Add new middleware
			const middlewareFunc1 = asyncErr => {
				const msg1 = '1a';
				return syncErr => {
					const outputSyncError = syncErr;
					outputSyncError.message += ` ${msg1} 1b`
					return outputSyncError;
				}
			}
			const middlewareFunc2 = asyncErr => {
				const msg1 = '2a';
				return syncErr => {
					const outputSyncError = syncErr;
					outputSyncError.message += ` ${msg1} 2b`
					return outputSyncError;
				}
			}
			const middlewareFunc3 = asyncErr => {
				const msg1 = '3a';
				return syncErr => {
					const outputSyncError = syncErr;
					outputSyncError.message += ` ${msg1} 3b`
					return outputSyncError;
				}
			}
			autoTrace.addGlobalMiddleware(middlewareFunc1);
			autoTrace.addGlobalMiddleware(middlewareFunc2);
			autoTrace.addGlobalMiddleware(middlewareFunc3);

			expect( () => autoTrace.throwAsyncStacktrace()(err)).toThrow(Error('error 1a 1b 2a 2b 3a 3b'));
		});
	});
	
	describe('syncStacktrace', () => {
		it('should create a new error where none is given', () => {
			expect(autoTrace.syncStacktrace()).toEqual(jasmine.any(Error));
		});
		it('should wraps non-errors in errors', () => {
			const result = autoTrace.syncStacktrace('non-error');
			expect(result).toEqual(Error('non-error'));
		});
		it('should not re-warp errors', () => {
			const err = new Error('error');
			expect(autoTrace.syncStacktrace(err)).toBe(err);
		});
		it('should apply a single middleware to error', () => {
			const err = new Error('error');

			//Add new middleware
			const middlewareFunc = asyncErr => {
				const msg1 = '1';
				return syncErr => {
					const outputSyncError = syncErr;
					outputSyncError.message += ` ${msg1} 2`
					return outputSyncError;
				}
			}
			autoTrace.addGlobalMiddleware(middlewareFunc);

			expect(autoTrace.syncStacktrace(err).message).toEqual('error 1 2');
		});
		it('should apply multiple middlewares and modify the error accordingly', () => {
			const err = new Error('error');

			//Add new middleware
			const middlewareFunc1 = asyncErr => {
				const msg1 = '1a';
				return syncErr => {
					const outputSyncError = syncErr;
					outputSyncError.message += ` ${msg1} 1b`
					return outputSyncError;
				}
			}
			const middlewareFunc2 = asyncErr => {
				const msg1 = '2a';
				return syncErr => {
					const outputSyncError = syncErr;
					outputSyncError.message += ` ${msg1} 2b`
					return outputSyncError;
				}
			}
			const middlewareFunc3 = asyncErr => {
				const msg1 = '3a';
				return syncErr => {
					const outputSyncError = syncErr;
					outputSyncError.message += ` ${msg1} 3b`
					return outputSyncError;
				}
			}
			autoTrace.addGlobalMiddleware(middlewareFunc1);
			autoTrace.addGlobalMiddleware(middlewareFunc2);
			autoTrace.addGlobalMiddleware(middlewareFunc3);

			expect(autoTrace.syncStacktrace(err).message).toEqual('error 1a 1b 2a 2b 3a 3b');
		});
	});

	describe('throwSyncStacktrace', () => {
		it('should throw a new error where none is given', () => {
			expect(() => autoTrace.throwSyncStacktrace()).toThrow(jasmine.any(Error));
		});
		it('should wrap non-errors in errors and throw', () => {
			expect( () => autoTrace.throwSyncStacktrace('non-error') ).toThrow(Error('non-error'));
		});
		it('should throw without re-wrapping errors', () => {
			const err = new Error('error');
			expect( () => autoTrace.throwSyncStacktrace(err) ).toThrow(err);
		});
		it('should apply a single extraMiddleware to error', () => {
			const err = new Error('error');

			//Add new middleware
			const middlewareFunc = asyncErr => {
				const msg1 = '1';
				return syncErr => {
					const outputSyncError = syncErr;
					outputSyncError.message += ` ${msg1} 2`
					return outputSyncError;
				}
			}
			autoTrace.addGlobalMiddleware(middlewareFunc);
			expect( () => autoTrace.throwSyncStacktrace(err) ).toThrow(Error('error 1 2'));
		});
		it('should apply multiple middlewares and modify the error accordingly', () => {
			const err = new Error('error');

			//Add new middleware
			const middlewareFunc1 = asyncErr => {
				const msg1 = '1a';
				return syncErr => {
					const outputSyncError = syncErr;
					outputSyncError.message += ` ${msg1} 1b`
					return outputSyncError;
				}
			}
			const middlewareFunc2 = asyncErr => {
				const msg1 = '2a';
				return syncErr => {
					const outputSyncError = syncErr;
					outputSyncError.message += ` ${msg1} 2b`
					return outputSyncError;
				}
			}
			const middlewareFunc3 = asyncErr => {
				const msg1 = '3a';
				return syncErr => {
					const outputSyncError = syncErr;
					outputSyncError.message += ` ${msg1} 3b`
					return outputSyncError;
				}
			}
			autoTrace.addGlobalMiddleware(middlewareFunc1);
			autoTrace.addGlobalMiddleware(middlewareFunc2);
			autoTrace.addGlobalMiddleware(middlewareFunc3);

			expect( () => autoTrace.throwSyncStacktrace(err) ).toThrow(Error('error 1a 1b 2a 2b 3a 3b'));
		});
	});

});