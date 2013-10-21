module.exports = Slide;

function Slide (number, slide, template) {
  var self = this;

  self.properties = slide.properties || {};
  self.source = slide.source || '';
  self.notes = slide.notes || '';
  self.number = function () {
    return number;
  };

  if (template) {
    inherit(self, template);
  }

  /**
   * Steps
   * =====
   */
  var callbacks = {
        setup: []
      , step: []
      }
    , stepIndex = null
    ;

  self.setup = function (callback) {
    callbacks.setup.push(callback);
    return self;
  };

  self.step = function (forward, backward) {
    callbacks.step.push({
      forward: forward
    , backward: backward
    , calls: 0
    });
    return self;
  };

  self.loop = self.step;

  self.init = function () {
    if (stepIndex === null) {
      self.rewind();
    }
  };

  self.rewind = function () {
    var initial = stepIndex === null;

    stepIndex = -1;
    callbacks.step.forEach(function (step) {
      step.calls = 0;
    });

    callbacks.setup.forEach(function (setupCallback) {
      setupCallback.call(self, initial);
    });

    return self;
  };

  self.forward = function () {
    var step
      , done
      ;

    // Make sure slide is initialized
    self.init();

    if (stepIndex === -1) {
      stepIndex = 0;
    }

    // Find step with forward action
    while (stepIndex < callbacks.step.length) {
      if (callbacks.step[stepIndex].forward) {
        step = callbacks.step[stepIndex];
        break;
      }
      stepIndex += 1;
    }

    if (step) {
      // Call step forward action
      done = step.forward.call(self, step.calls);

      if (done || done === undefined) {
        // Move to next step
        stepIndex += 1;
      }
      else {
        // Stay on step, increment step counter
        step.calls += 1;
      }

      return true;
    }
    else {
      return false;
    }
  };

  self.backward = function () {
    var step
      , done
      ;

    // Make sure slide is initialized
    self.init();

    // Find step with backward action
    while (stepIndex >= 0) {
      step = callbacks.step[stepIndex];
      if (step && step.backward) {
        break;
      }
      step = undefined;
      stepIndex -= 1;
    }

    if (step) {
      // Call step backward action
      done = step.backward.call(self, step.calls);

      if (done || done === undefined) {
        // Move to previous step
        stepIndex -= 1;
        // Clear out step counter
        step.calls = 0;
      }
      else {
        // Stay on step, decrement step counter
        step.calls -= 1;
      }

      return true;
    }
    else {
      return false;
    }
  };
}

function inherit (slide, template) {
  inheritProperties(slide, template);
  inheritSource(slide, template);
  inheritNotes(slide, template);
}

function inheritProperties (slide, template) {
  var property
    , value
    ;

  for (property in template.properties) {
    if (!template.properties.hasOwnProperty(property) ||
        ignoreProperty(property)) {
      continue;
    }

    value = [template.properties[property]];

    if (property === 'class' && slide.properties[property]) {
      value.push(slide.properties[property]);
    }

    if (property === 'class' || slide.properties[property] === undefined) {
      slide.properties[property] = value.join(', ');
    }
  }
}

function ignoreProperty (property) {
  return property === 'name' ||
    property === 'layout';
}

function inheritSource (slide, template) {
  var expandedVariables;

  slide.properties.content = slide.source;
  slide.source = template.source;

  expandedVariables = slide.expandVariables(/* contentOnly: */ true);

  if (expandedVariables.content === undefined) {
    slide.source += slide.properties.content;
  }

  delete slide.properties.content;
}

function inheritNotes (slide, template) {
  if (template.notes) {
    slide.notes = template.notes + '\n\n' + slide.notes;
  }
}

Slide.prototype.expandVariables = function (contentOnly) {
  var properties = this.properties
    , expandResult = {}
    ;

  this.source = this.source.replace(/(\\)?(\{\{([^\}\n]+)\}\})/g,
    function (match, escaped, unescapedMatch, property) {
      var propertyName = property.trim()
        , propertyValue
        ;

      if (escaped) {
        return contentOnly ? match[0] : unescapedMatch;
      }

      if (contentOnly && propertyName !== 'content') {
        return match;
      }

      propertyValue = properties[propertyName];

      if (propertyValue !== undefined) {
        expandResult[propertyName] = propertyValue;
        return propertyValue;
      }

      return propertyName === 'content' ? '' : unescapedMatch;
    });

  return expandResult;
};
