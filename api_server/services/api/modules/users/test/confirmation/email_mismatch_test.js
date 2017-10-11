'use strict';

var Confirmation_Test = require('./confirmation_test');

class Email_Mismatch_Test extends Confirmation_Test {

	get description () {
		return 'should return an error when confirming a registration with an email that doesn\'t match the original email used during registration';
	}

	get_expected_fields () {
		return null;
	}

	get_expected_error () {
		return {
			code: 'USRC-1005'
		};
	}

	before (callback) {
		super.before(() => {
			this.data.email = this.user_factory.random_email();
			callback();
		});
	}
}

module.exports = Email_Mismatch_Test;
