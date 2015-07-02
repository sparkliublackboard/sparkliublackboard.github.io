
var baseUrl = 'https://lunch-tool-sparkliu-blackboard.firebaseio.com/';

function fillZero(num, length) {
    num = num.toString().trim();
    var numLength = num.length;
    for (var index = numLength; index < length; index++) {
        num = '0' + num;
    }
    return num;
}
function getTodayDateId() {
    var today = new Date();
    return fillZero(today.getFullYear(), 4) +
        fillZero((today.getMonth() + 1), 2) +
        fillZero(today.getDate(), 2);
}
var hasAlertFailConnecting = false;
function alertFailConnecting() {
    if (!hasAlertFailConnecting) {
        hasAlertFailConnecting = true;
        alert('无法连接数据库，请刷新页面');
    }
}

angular.module('lunchApp', ['firebase'])
    .controller('lunchAppController', ['$scope', '$firebaseObject', '$firebaseArray',
        function($scope, $firebaseObject, $firebaseArray) {
            $scope.todaySuggestionLoaded = false;
            $scope.isChoicesLoaded = false;
            $scope.isAddingChoice = false;

            var todaySuggestionUrl = baseUrl + 'suggestion/' + getTodayDateId();
            var todaySuggestion = $firebaseObject(new Firebase(todaySuggestionUrl));
            todaySuggestion.$bindTo($scope, 'today');
            var todaySuggestionLoadPromise = todaySuggestion.$loaded().then(function() {
                $scope.todaySuggestionLoaded = true;
            }, alertFailConnecting);

            var choicesUrl = baseUrl + 'choices/';
            $scope.choices = $firebaseArray(new Firebase(choicesUrl));
            var choiceLoaded = $scope.choices.$loaded();
            choiceLoaded.then(function() {
                $scope.isChoicesLoaded = true;
            }, alertFailConnecting);

            var unwatch = $scope.$watchGroup(['choices', 'isAddingChoice', 'today', 'today.$value'],
                function() {
                    if ($scope.today && $scope.today.$value) {
                        unwatch();
                        return;
                    }
                    if ($scope.choices.length && !$scope.isAddingChoice) {
                        todaySuggestionLoadPromise = todaySuggestionLoadPromise.then(function() {
                            var findResult = findOne();
                            if (findResult) {
                                todaySuggestion.$value = findResult.$value;
                                return todaySuggestion.$save();
                            }
                        });
                    }
                });

            function findOne() {
                if (!$scope.choices.length) { return null; }
                return $scope.choices[Math.floor(Math.random() * $scope.choices.length)];
            }

            $scope.selfChooseResult = '';
            $scope.selfChoose = function() {
                $scope.selfChooseResult = findOne();
            };
            $scope.canSelfChoose = function() {
                return $scope.isChoicesLoaded && !$scope.isAddingChoice;
            };

            $scope.filter = '';
            $scope.filteredChoices = [];
            var updateFilteredChoices = function() {
                if (!$scope.choices || !$scope.choices.length) {
                    if ($scope.filteredChoices.length) {
                        $scope.filteredChoices = [];
                    }
                    return;
                }
                var filterString = ($scope.filter || '').trim();
                var filteredChoices = $scope.choices.filter(function(choice) {
                    return !!choice.$value;
                });
                if (!filterString) {
                    $scope.filteredChoices = filteredChoices;
                } else {
                    $scope.filteredChoices = filteredChoices.filter(function (choice) {
                        return choice.$value.toLowerCase().indexOf($scope.filter) !== -1;
                    });
                }
            };
            $scope.$watchCollection('choices', updateFilteredChoices);
            $scope.$watch('filter', updateFilteredChoices);

            $scope.newChoice = '';
            $scope.addChoice = function() {
                $scope.isAddingChoice = true;
                $scope.choices.$add($scope.newChoice).then(function() {
                    $scope.isAddingChoice = false;
                    $scope.newChoice = '';
                }, alertFailConnecting);
            };
            $scope.canAddChoice = function() {
                return $scope.isChoicesLoaded && !$scope.isAddingChoice && $scope.newChoice.trim();
            };
        }]);