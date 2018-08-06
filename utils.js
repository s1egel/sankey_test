function formatType(valueFormat) {
  if (typeof valueFormat != "string") {
    return function (x) {return x}
  }
  let format = ""
  switch (valueFormat.charAt(0)) {
    case '$':
      format += '$'; break
    case '£':
      format += '£'; break
    case '€':
      format += '€'; break
  }
  if (valueFormat.indexOf(',') > -1) {
    format += ','
  }
  splitValueFormat = valueFormat.split(".")
  format += '.'
  format += splitValueFormat.length > 1 ? splitValueFormat[1].length : 0

  switch(valueFormat.slice(-1)) {
    case '%':
      format += '%'; break
    case '0':
      format += 'f'; break
  }
  return d3.format(format)
}
