async function joiValidate(input, schema) {
    let body;

    try {
        body = await schema.validateAsync(input, {
            abortEarly  : false,
            stripUnknown: true,
            convert     : true
        });
    } catch (err) {
        throw (err);
    }

    return body;
};

module.exports = joiValidate;
