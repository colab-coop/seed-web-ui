
function test2() {
  alert("test2");
}

function registerHooks() {
  $("#cardNumber").change(function() {
//    alert("card number changed");
    updateCardInfo();
  })
}

function updateCardInfo() {
  var cardForm = document.getElementById("cardForm");
  var card = cardForm.elements["cardNumber"].value;
  var bin = card.slice(0,6);

  $.ajax({
    url: "/api/binbase/" + bin,
    context: document.body,
    success: function(result) {
      if (result) {
        var bindata = "<b>Information about your card</b>: <br>&nbsp; &nbsp;" + result.cardBrand + ", " + result.cardType + ", " + result.cardCategory +
          ", " + result.issuingOrg + ", " + (result.isRegulated ? "regulated bank" : "unregulated bank") + "";
        var infoDiv = document.getElementById("cardInfo");
        $("#cardInfo").html(bindata);
      } else {
        console.log("info not found for bin: " + card);
        $("#cardInfo").html("<br><br>");
      }
    }
  });
}
