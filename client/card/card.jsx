var React = require( 'react/addons' );

module.exports = React.createClass( {
	displayName: 'Card',

	render: function() {
		return React.createElement( 'div', { className: 'card' }, this.props.children );
	}
} );
