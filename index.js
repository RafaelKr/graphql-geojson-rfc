const {
	GraphQLString: Str,
	GraphQLFloat: Float,
	GraphQLList: List,
	GraphQLEnumType: EnumType,
	GraphQLObjectType: ObjectType,
	GraphQLScalarType: ScalarType,
	GraphQLInterfaceType: InterfaceType,
	GraphQLNonNull: NonNull,
} = require('graphql')

const list = (type) => new List(type)
const nonNull = (type) => new NonNull(type)
const nonNullList = (type) => nonNull(list(nonNull(type)))

const GeoJSONGeometryTypeValues = {
	Point: { value: 'Point' },
	MultiPoint: { value: 'MultiPoint' },
	LineString: { value: 'LineString' },
	MultiLineString: { value: 'MultiLineString' },
	Polygon: { value: 'Polygon' },
	MultiPolygon: { value: 'MultiPolygon' },
	GeometryCollection: { value: 'GeometryCollection' },
}

const GeoJSONTypeValues = {
	...GeoJSONGeometryTypeValues,
	Feature: { value: 'Feature' },
	FeatureCollection: { value: 'FeatureCollection' },
}

const GeoJSONEnums = {
	GeometryTypeEnum: new EnumType({
		name: 'GeoJSONGeometryType',
		description: 'Enumeration of all GeoJSON geometry types.',
		values: GeoJSONGeometryTypeValues,
	}),

	TypeEnum: new EnumType({
		name: 'GeoJSONType',
		description: 'Enumeration of all GeoJSON types.',
		values: GeoJSONTypeValues,
	}),
}

const GeoJSONScalars = {
	PositionScalar: new ScalarType({
		name: 'GeoJSONPosition',
		description: 'Type: [number, number, number?]\n\nA single position.',
		serialize: coerceCoordinates,
		parseValue: coerceCoordinates,
		parseLiteral: parseCoordinates,
	}),

	CoordinatesPointScalar: new ScalarType({
		name: 'GeoJSONCoordinatesPoint',
		description: 'Type: GeoJSONPosition\n\nA single position.',
		serialize: coerceCoordinates,
		parseValue: coerceCoordinates,
		parseLiteral: parseCoordinates,
	}),

	CoordinatesLineStringScalar: new ScalarType({
		name: 'GeoJSONCoordinatesLineString',
		description: 'Type: GeoJSONCoordinatesPoint[]\n\nAn array of two or more positions.',
		serialize: coerceCoordinates,
		parseValue: coerceCoordinates,
		parseLiteral: parseCoordinates,
	}),

	CoordinatesPolygonScalar: new ScalarType({
		name: 'GeoJSONCoordinatesPolygon',
		description: 'Type: GeoJSONCoordinatesLineString[]\n\nAn array of closed GeoJSONCoordinatesLineString with four or more positions. The first and last positions are equivalent and they MUST contain identical values.',
		serialize: coerceCoordinates,
		parseValue: coerceCoordinates,
		parseLiteral: parseCoordinates,
	}),

	JsonScalar: new ScalarType({
		name: 'JSONObject',
		description: 'Arbitrary JSON value',
		serialize: coerceObject,
		parseValue: coerceObject,
		parseLiteral: parseObject,
	}),
}

const GeoJSONInterfaces = {
	ObjectInterface: new InterfaceType({
		name: 'GeoJSONObjectInterface',
		fields: () => ({
			type: { type: nonNull(GeoJSON.TypeEnum) },
			bbox: { type: list(Float) },
		}),
		resolveType: value => GeoJSON[`${value.type}Object`],
	}),

	GeometryObjectInterface: new InterfaceType({
		name: 'GeoJSONGeometryObjectInterface',
		fields: () => ({
			type: { type: nonNull(GeoJSON.GeometryTypeEnum) },
			bbox: { type: list(Float) },
		}),
		resolveType: value => GeoJSONGeometryObjects[`${value.type}Object`],
	}),
}

const GeoJSONGeometryObjects = {
	PointObject: new ObjectType({
		name: 'GeoJSONPoint',
		description: 'Object describing a single geographical point.',
		interfaces: () => [GeoJSON.GeometryObjectInterface],
		fields: () => ({
			type: { type: nonNull(GeoJSON.GeometryTypeEnum) },
			bbox: { type: list(Float) },
			coordinates: { type: nonNull(GeoJSONScalars.CoordinatesPointScalar) },
		}),
	}),

	MultiPointObject: new ObjectType({
		name: 'GeoJSONMultiPoint',
		description: 'Object describing multiple geographical points.',
		interfaces: () => [GeoJSON.GeometryObjectInterface],
		fields: () => ({
			type: { type: nonNull(GeoJSON.GeometryTypeEnum) },
			bbox: { type: list(Float) },
			coordinates: { type: nonNullList(GeoJSONScalars.CoordinatesPointScalar) },
		}),
	}),

	LineStringObject: new ObjectType({
		name: 'GeoJSONLineString',
		description: 'Object describing a single connected sequence of geographical points.',
		interfaces: () => [GeoJSON.GeometryObjectInterface],
		fields: () => ({
			type: { type: nonNull(GeoJSON.GeometryTypeEnum) },
			bbox: { type: list(Float) },
			coordinates: { type: nonNull(GeoJSONScalars.CoordinatesLineStringScalar) },
		}),
	}),

	MultiLineStringObject: new ObjectType({
		name: 'GeoJSONMultiLineString',
		description: 'Object describing multiple connected sequences of geographical points.',
		interfaces: () => [GeoJSON.GeometryObjectInterface],
		fields: () => ({
			type: { type: nonNull(GeoJSON.GeometryTypeEnum) },
			bbox: { type: list(Float) },
			coordinates: { type: nonNullList(GeoJSONScalars.CoordinatesLineStringScalar) },
		}),
	}),

	PolygonObject: new ObjectType({
		name: 'GeoJSONPolygon',
		description: 'Object describing a single shape formed by a set of geographical points.',
		interfaces: () => [GeoJSON.GeometryObjectInterface],
		fields: () => ({
			type: { type: nonNull(GeoJSON.GeometryTypeEnum) },
			bbox: { type: list(Float) },
			coordinates: { type: nonNull(GeoJSONScalars.CoordinatesPolygonScalar) },
		}),
	}),

	MultiPolygonObject: new ObjectType({
		name: 'GeoJSONMultiPolygon',
		description: 'Object describing multiple shapes formed by sets of geographical points.',
		interfaces: () => [GeoJSON.GeometryObjectInterface],
		fields: () => ({
			type: { type: nonNull(GeoJSON.GeometryTypeEnum) },
			bbox: { type: list(Float) },
			coordinates: { type: nonNullList(GeoJSONScalars.CoordinatesPolygonScalar) },
		}),
	}),

	GeometryCollectionObject: new ObjectType({
		name: 'GeoJSONGeometryCollection',
		description: 'A set of multiple geometries, possibly of various types.',
		interfaces: () => [GeoJSON.GeometryObjectInterface],
		fields: () => ({
			type: { type: nonNull(GeoJSON.GeometryTypeEnum) },
			bbox: { type: list(Float) },
			geometries: { type: nonNullList(GeoJSON.GeometryObjectInterface) },
		}),
	}),
}

const GeoJSON = {
	...GeoJSONEnums,
	...GeoJSONScalars,
	...GeoJSONInterfaces,
	...GeoJSONGeometryObjects,

	FeatureObject: new ObjectType({
		name: 'GeoJSONFeature',
		description: 'An object that links a geometry to properties in order to provide context.',
		interfaces: () => [GeoJSON.ObjectInterface],
		fields: () => ({
			type: { type: nonNull(GeoJSON.TypeEnum) },
			bbox: { type: list(Float) },
			geometry: { type: GeoJSON.GeometryObjectInterface },
			properties: { type: GeoJSON.JsonScalar },
			id: { type: Str },
		}),
	}),

	FeatureCollectionObject: new ObjectType({
		name: 'GeoJSONFeatureCollection',
		description: 'A set of multiple features.',
		interfaces: () => [GeoJSON.ObjectInterface],
		fields: () => ({
			type: { type: nonNull(GeoJSON.TypeEnum) },
			bbox: { type: list(Float) },
			features: { type: nonNullList(GeoJSON.FeatureObject) },
		}),
	}),
}

function coerceCoordinates(value) {
	return value
}

function parseCoordinates(valueAST) {
	return valueAST.value
}

function coerceObject(value) {
	return JSON.parse(value)
}

function parseObject(valueAST) {
	return JSON.stringify(valueAST.value)
}

module.exports = {
	GeoJSON,
	GeoJSONEnums,
	GeoJSONScalars,
	GeoJSONInterfaces,
	GeoJSONGeometryObjects,
}
